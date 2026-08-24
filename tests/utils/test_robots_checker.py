"""Tests for robots.txt compliance checking.

The provenance statement in frontend/public/llms.txt says listings are only
collected where the source site permits it. These tests are what make that
claim true rather than aspirational.
"""

import pytest

from utils.robots_checker import USER_AGENT, RobotsChecker

pytestmark = pytest.mark.unit


class StubChecker(RobotsChecker):
    """RobotsChecker with the network replaced by a canned response."""

    def __init__(self, body, status=200, **kwargs):
        super().__init__(**kwargs)
        self._body = body
        self._status = status
        self.fetches = []

    def _fetch(self, robots_url):
        self.fetches.append(robots_url)
        return self._body, self._status


class TestExplicitRules:
    def test_allows_when_nothing_is_disallowed(self):
        c = StubChecker("User-agent: *\nAllow: /\n")
        assert c.check("https://example.org/dogs").allowed

    def test_blocks_a_path_the_site_disallows(self):
        c = StubChecker("User-agent: *\nDisallow: /dogs\n")
        d = c.check("https://example.org/dogs")
        assert not d.allowed
        assert "disallow" in d.reason.lower()

    def test_blocks_everything_under_a_site_wide_disallow(self):
        c = StubChecker("User-agent: *\nDisallow: /\n")
        assert not c.check("https://example.org/anything").allowed

    def test_honours_a_rule_naming_our_agent_over_the_wildcard(self):
        # A named group wins, so a site can single us out either way.
        c = StubChecker(f"User-agent: *\nDisallow: /\n\nUser-agent: {USER_AGENT}\nAllow: /\n")
        assert c.check("https://example.org/dogs").allowed

    def test_respects_a_disallow_aimed_only_at_us(self):
        c = StubChecker(f"User-agent: *\nAllow: /\n\nUser-agent: {USER_AGENT}\nDisallow: /\n")
        assert not c.check("https://example.org/dogs").allowed

    def test_reports_crawl_delay_when_the_site_sets_one(self):
        c = StubChecker("User-agent: *\nCrawl-delay: 7\nAllow: /\n")
        assert c.check("https://example.org/dogs").crawl_delay == 7.0


class TestMissingOrBrokenRobots:
    def test_allows_when_robots_txt_does_not_exist(self):
        # RFC 9309: 404 means no restrictions were expressed.
        c = StubChecker(None, status=404)
        d = c.check("https://example.org/dogs")
        assert d.allowed
        assert "404" in d.reason or "no robots.txt" in d.reason.lower()

    def test_allows_but_flags_when_robots_txt_is_unreachable(self):
        # A transient outage should not silently halt the pipeline, but it
        # must be visible rather than being mistaken for permission.
        c = StubChecker(None, status=503)
        d = c.check("https://example.org/dogs")
        assert d.allowed
        assert d.uncertain

    def test_a_clean_allow_is_not_marked_uncertain(self):
        assert not StubChecker("User-agent: *\nAllow: /\n").check("https://example.org/x").uncertain


class TestFetching:
    def test_asks_for_robots_txt_at_the_domain_root(self):
        c = StubChecker("User-agent: *\nAllow: /\n")
        c.check("https://example.org/deep/path/page.html")
        assert c.fetches == ["https://example.org/robots.txt"]

    def test_fetches_once_per_host_then_reuses(self):
        c = StubChecker("User-agent: *\nAllow: /\n")
        c.check("https://example.org/a")
        c.check("https://example.org/b")
        c.check("https://other.org/c")
        assert c.fetches == ["https://example.org/robots.txt", "https://other.org/robots.txt"]

    def test_rejects_a_url_with_no_host(self):
        d = StubChecker("").check("not-a-url")
        assert not d.allowed
        assert "url" in d.reason.lower()
