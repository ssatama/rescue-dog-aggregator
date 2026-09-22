"""An empty completion must fail loudly, not as a confusing JSON error.

When reasoning consumes the whole max_tokens budget the provider returns
`finish_reason: "length"` with empty content. That reached `json.loads("")` and
surfaced as `Expecting value: line 1 column 1 (char 0)`, which reads like a
malformed-JSON bug and hides which model actually burnt the budget.
"""

from unittest.mock import AsyncMock

import pytest

from services.llm.dog_profiler import DogProfilerPipeline
from services.llm.llm_client import EmptyLLMResponseError, LLMClient, TruncatedLLMResponseError


@pytest.fixture
def client():
    return LLMClient(api_key="test-key")


def _response(content, finish_reason="stop", model="deepseek/deepseek-v4-flash"):
    return {
        "model": model,
        "choices": [{"message": {"content": content}, "finish_reason": finish_reason}],
    }


@pytest.mark.unit
class TestEmptyCompletion:
    def test_raises_when_the_budget_was_spent_on_reasoning(self, client):
        with pytest.raises(EmptyLLMResponseError):
            client.extract_content_from_response(_response("", finish_reason="length"))

    def test_raises_on_a_null_content_field(self, client):
        with pytest.raises(EmptyLLMResponseError):
            client.extract_content_from_response(_response(None))

    def test_raises_on_whitespace_only_content(self, client):
        with pytest.raises(EmptyLLMResponseError):
            client.extract_content_from_response(_response("   \n  "))

    def test_error_names_the_model_and_finish_reason_for_triage(self, client):
        with pytest.raises(EmptyLLMResponseError) as exc:
            client.extract_content_from_response(_response("", finish_reason="length", model="deepseek/deepseek-v4-flash"))

        message = str(exc.value)
        assert "deepseek/deepseek-v4-flash" in message
        assert "length" in message


@pytest.mark.unit
class TestRealContentIsUntouched:
    def test_plain_json_passes_through(self, client):
        assert client.extract_content_from_response(_response('{"name": "Gabi"}')) == '{"name": "Gabi"}'

    def test_markdown_fenced_json_is_still_unwrapped(self, client):
        """claude-sonnet-5 fences its output even under response_format=json_object."""
        fenced = '```json\n{"name": "Gabi"}\n```'

        assert client.extract_content_from_response(_response(fenced)) == '{"name": "Gabi"}'


TRUNCATED_PROFILE = '{\n  "description": "Woody and Jessie have been side by side through life.",\n  "experience_level": "'


@pytest.mark.unit
class TestTruncatedCompletion:
    """Dog 11575 (Woody & Jessie) failed every Dogs Trust run from January to
    September: reasoning spent most of the 4000-token budget, the answer was cut
    off mid-string, and json.loads reported "Unterminated string", which the
    retry handler treated as a formatting mistake and re-asked for plain JSON.
    """

    def test_raises_when_content_was_cut_off_by_the_token_limit(self, client):
        with pytest.raises(TruncatedLLMResponseError):
            client.extract_content_from_response(_response(TRUNCATED_PROFILE, finish_reason="length"))

    def test_error_names_the_model_for_triage(self, client):
        with pytest.raises(TruncatedLLMResponseError) as exc:
            client.extract_content_from_response(_response(TRUNCATED_PROFILE, finish_reason="length", model="openai/gpt-6-mini"))

        assert "openai/gpt-6-mini" in str(exc.value)

    def test_complete_answer_is_not_mistaken_for_truncation(self, client):
        assert client.extract_content_from_response(_response('{"name": "Gabi"}', finish_reason="stop")) == '{"name": "Gabi"}'


@pytest.mark.unit
class TestProfileTokenBudget:
    @pytest.mark.asyncio
    async def test_profile_request_leaves_room_for_reasoning_and_a_full_profile(self, monkeypatch):
        """A full profile is ~1000 output tokens; effort:low reasoning on the
        models the auto-router picks has been seen to spend over 3800 more."""
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key-never-used")
        pipeline = DogProfilerPipeline(organization_id=28, dry_run=True)
        pipeline.llm_client.call_api_and_parse = AsyncMock(return_value={})

        await pipeline._call_llm_api(dog_data={"id": 11575, "name": "Woody & Jessie", "properties": {}}, model=None)

        requested = pipeline.llm_client.call_api_and_parse.call_args.kwargs["max_tokens"]
        assert requested >= 8000, f"profile budget {requested} leaves too little room after reasoning"

    @pytest.mark.asyncio
    async def test_profile_timeout_leaves_time_to_generate_the_full_budget(self, monkeypatch):
        """Truncated calls returned 4000 tokens inside the old 35s limit, so
        doubling the budget at 30s would trade truncation for timeouts."""
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key-never-used")
        pipeline = DogProfilerPipeline(organization_id=28, dry_run=True)
        pipeline.retry_handler.execute_with_retry = AsyncMock(return_value=None)
        grounded = {"id": 11575, "name": "Woody & Jessie", "properties": {"description": "Woody and Jessie are a bonded pair. " * 10}}

        await pipeline.process_dog(grounded)

        timeout = pipeline.retry_handler.execute_with_retry.call_args.kwargs["timeout"]
        assert timeout >= 60.0, f"profile timeout {timeout}s cannot fit an 8000-token completion"
