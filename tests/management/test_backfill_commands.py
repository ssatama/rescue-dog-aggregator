"""backfill_commands: plan writes nothing; apply refuses without confirmation (#556)."""

import json
import os
from unittest.mock import Mock, patch

import pytest

from management import backfill_commands
from scrapers.base_scraper import BaseScraper


class _FakeRescueScraper(BaseScraper):
    def collect_data(self):
        if self.skip_existing_animals:
            return []
        return [
            {
                "name": "Rex",
                "external_id": "fake-rex",
                "adoption_url": "https://example.org/rex",
                "primary_image_url": "https://example.org/rex.jpg",
                "breed": "Labrador",
                "properties": {"description": "A good dog."},
            },
            {"name": "Nemo", "external_id": "fake-nemo", "adoption_url": "https://example.org/nemo", "primary_image_url": None},
        ]


@pytest.fixture(autouse=True)
def restore_force_rescrape(monkeypatch):
    """scrape_without_saving sets FORCE_RESCRAPE for its process; don't let it leak into other tests."""
    monkeypatch.setenv("FORCE_RESCRAPE", "")


@pytest.fixture
def fake_scraper_class():
    config = Mock()
    config.get_scraper_config_dict.return_value = {"rate_limit_delay": 0, "skip_existing_animals": True}
    config.name = "Fake Rescue"
    with (
        patch("utils.config_loader.ConfigLoader.load_config", return_value=config),
        patch("scrapers.base_scraper.ConfigLoader") as loader,
        patch("utils.secure_scraper_loader.SecureScraperLoader.load_scraper_class", return_value=_FakeRescueScraper),
        patch("utils.db_connection.initialize_database_pool"),
    ):
        loader.return_value.load_config.return_value = config
        yield


@pytest.mark.unit
class TestPlanWritesNothing:
    def test_plan_saves_uploads_and_profiles_nothing(self, fake_scraper_class, tmp_path, capsys):
        stored = [
            {
                "id": 5,
                "external_id": "fake-rex",
                "status": "available",
                "active": True,
                "name": "Rex",
                "breed": "Collie",
                "original_image_url": "https://example.org/rex.jpg",
                "properties": {"description": "A good dog."},
            }
        ]
        prod_queries = []

        def fake_prod_rows(sql):
            prod_queries.append(sql)
            return stored

        out = tmp_path / "plan.json"
        with (
            patch.object(backfill_commands, "prod_rows", side_effect=fake_prod_rows),
            patch("psycopg2.connect", side_effect=AssertionError("plan must not open a database connection")),
            patch.object(BaseScraper, "save_animal", side_effect=AssertionError("plan must not save")),
            patch("services.database_service.DatabaseService.create_animal", side_effect=AssertionError("plan must not insert")),
            patch("services.database_service.DatabaseService.update_animal", side_effect=AssertionError("plan must not update")),
            patch("utils.r2_service.R2Service.upload_image_from_url", side_effect=AssertionError("plan must not upload")),
            patch("scrapers.enrichment.llm_handler.LLMEnrichmentHandler.enrich_animals", side_effect=AssertionError("plan must not profile")),
        ):
            assert backfill_commands.main(["plan", "--org", "fake-rescue", "--out", str(out)]) == 0

        assert len(prod_queries) == 1
        assert all(sql.lstrip().upper().startswith("SELECT") for sql in prod_queries)
        assert "'fake-rex'" in prod_queries[0]

        plan = json.loads(out.read_text())["plan"]
        assert plan["rejected"] == [{"external_id": "fake-nemo", "reason": "no_image"}]
        assert "breed" in plan["fields"]
        assert "Backfill plan: `fake-rescue`" in capsys.readouterr().out

    def test_plan_turns_skipping_off(self, fake_scraper_class):
        """The config says skip_existing_animals; the fake returns nothing while skipping is on."""
        scraped, _ = backfill_commands.scrape_without_saving("fake-rescue")

        assert os.environ["FORCE_RESCRAPE"] == "true"
        assert [dog["external_id"] for dog in scraped] == ["fake-rex"]


@pytest.mark.unit
class TestProdRows:
    def test_cloud_sessions_go_through_the_admin_api(self, monkeypatch):
        monkeypatch.delenv("PROD_RO_DATABASE_URL", raising=False)
        monkeypatch.setenv("CLAUDE_CODE_REMOTE", "true")
        with patch("scripts.mcp_prod_query.fetch_rows", return_value=([{"id": 1}], False)) as fetch:
            assert backfill_commands.prod_rows("SELECT 1") == [{"id": 1}]
        assert fetch.call_args.kwargs["limit"] == backfill_commands.ADMIN_QUERY_MAX_ROWS

    def test_a_truncated_api_answer_is_an_error(self, monkeypatch):
        monkeypatch.delenv("PROD_RO_DATABASE_URL", raising=False)
        monkeypatch.setenv("CLAUDE_CODE_REMOTE", "true")
        with patch("scripts.mcp_prod_query.fetch_rows", return_value=([], True)), pytest.raises(RuntimeError, match="narrow"):
            backfill_commands.prod_rows("SELECT 1")

    def test_no_access_is_an_error(self, monkeypatch):
        for name in ("PROD_RO_DATABASE_URL", "CLAUDE_CODE_REMOTE", "ADMIN_API_KEY"):
            monkeypatch.delenv(name, raising=False)
        with pytest.raises(RuntimeError, match="PROD_RO_DATABASE_URL"):
            backfill_commands.prod_rows("SELECT 1")

    def test_ids_are_quoted_as_sql_literals(self):
        sql = backfill_commands.stored_rows_sql("o'rg", ["it's"])

        assert "'o''rg'" in sql
        assert "'it''s'" in sql


@pytest.mark.unit
class TestApply:
    def test_refuses_without_confirm(self, monkeypatch):
        monkeypatch.setenv("RAILWAY_DATABASE_URL", "postgresql://example/db")
        with patch("psycopg2.connect") as connect:
            assert backfill_commands.main(["apply", "--orgs", "rean"]) == 2
        connect.assert_not_called()

    def test_refuses_without_a_target_database(self, monkeypatch):
        monkeypatch.delenv("RAILWAY_DATABASE_URL", raising=False)
        with patch("psycopg2.connect") as connect:
            assert backfill_commands.main(["apply", "--orgs", "rean", "--confirm"]) == 2
        connect.assert_not_called()

    def test_text_changed_lists_dogs_whose_profile_text_moved(self):
        before = {1: (True, ("old", None)), 2: (True, ("same", None))}
        after = {1: (True, ("new", None)), 2: (True, ("same", None)), 3: (True, ("brand new", None))}

        assert backfill_commands.text_changed(before, after) == [1]


@pytest.mark.unit
class TestStepSql:
    def test_organizations_are_filtered_in_sql(self):
        step = backfill_commands.get_steps(["clear-fabricated-ages"])[0]

        sql = backfill_commands.step_sql(step, {"rean", "o'rg"})

        assert sql.endswith("WHERE organization IN ('o''rg', 'rean')")
        assert step.fetch_sql in sql

    def test_no_organizations_leaves_the_query_alone(self):
        step = backfill_commands.get_steps(["clear-fabricated-ages"])[0]

        assert backfill_commands.step_sql(step, None) == step.fetch_sql


@pytest.mark.unit
class TestSnapshot:
    def test_inactive_dogs_are_included_so_a_reactivated_dog_is_reprofiled(self):
        rows = [
            {"config_id": "rean", "id": 1, "listed": False, "properties": {"description": "old"}},
            {"config_id": "rean", "id": 2, "listed": True, "properties": {"description": "same"}},
        ]
        with patch.object(backfill_commands, "_rows", return_value=rows) as query:
            before = backfill_commands._snapshot("postgresql://example/db", ["rean"])

        assert "a.active" not in query.call_args.args[1].split("WHERE")[1]
        after = {1: (True, ("new",) + (None,) * 8), 2: before["rean"][2]}
        assert backfill_commands.text_changed(before["rean"], after) == [1]

    def test_steps_run_for_every_rescue_not_just_the_rescraped_ones(self, monkeypatch):
        monkeypatch.setenv("RAILWAY_DATABASE_URL", "postgresql://example/db")
        with (
            patch.object(backfill_commands, "_snapshot", return_value={"rean": {}}),
            patch.object(backfill_commands, "_run", return_value=0),
            patch.object(backfill_commands, "plan_steps", return_value={}) as plan,
            patch("psycopg2.connect"),
        ):
            assert backfill_commands.main(["apply", "--orgs", "rean", "--steps", "clear-fabricated-ages", "--confirm"]) == 0

        assert plan.call_args.args[1] is None
