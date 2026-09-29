"""An old slug redirects to the dog's current one, by the id it ends with (#634)."""

import pytest


@pytest.mark.database
@pytest.mark.integration
class TestAnOldSlugRedirects:
    def test_a_changed_slug_301s_to_the_current_one(self, client):
        # 9001's slug is test-male-dog; its old one ended in its id
        response = client.get("/api/animals/sunny-unknown-9001", follow_redirects=False)

        assert response.status_code == 301
        assert response.headers["location"] == "/api/animals/test-male-dog"

    def test_an_unknown_slug_without_a_known_id_is_a_404(self, client):
        assert client.get("/api/animals/nobody-unknown-99999999", follow_redirects=False).status_code == 404
        assert client.get("/api/animals/no-id-at-all", follow_redirects=False).status_code == 404
