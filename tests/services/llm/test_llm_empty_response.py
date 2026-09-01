"""An empty completion must fail loudly, not as a confusing JSON error.

When reasoning consumes the whole max_tokens budget the provider returns
`finish_reason: "length"` with empty content. That reached `json.loads("")` and
surfaced as `Expecting value: line 1 column 1 (char 0)`, which reads like a
malformed-JSON bug and hides which model actually burnt the budget.
"""

import pytest

from services.llm.llm_client import EmptyLLMResponseError, LLMClient


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
