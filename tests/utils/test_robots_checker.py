"""Tests for robots.txt compliance checking.

These tests cover the check that makes collection conditional on the source
site permitting it, so the provenance claim in frontend/public/llms.txt can be
stated as behaviour rather than intention.
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

    def test_a_429_is_not_treated_as_permission(self):
        # RFC 9309 excludes 429 from the 4xx allow rule: the site is asking us
        # to back off, not telling us there are no rules.
        d = StubChecker(None, status=429).check("https://example.org/dogs")
        assert d.uncertain

    def test_a_clean_allow_is_not_marked_uncertain(self):
        assert not StubChecker("User-agent: *\nAllow: /\n").check("https://example.org/x").uncertain


class TestFetching:
    def test_asks_for_robots_txt_at_the_domain_root(self):
        c = StubChecker("User-agent: *\nAllow: /\n")
        c.check("https://example.org/deep/path/page.html")
        assert c.fetches == ["https://example.org/robots.txt"]

    def test_does_not_reuse_an_http_result_for_https(self):
        # robots.txt is scoped per scheme and authority.
        c = StubChecker("User-agent: *\nAllow: /\n")
        c.check("http://example.org/a")
        c.check("https://example.org/b")
        assert len(c.fetches) == 2

    def test_fetches_once_per_host_then_reuses(self):
        c = StubChecker("User-agent: *\nAllow: /\n")
        c.check("https://example.org/a")
        c.check("https://example.org/b")
        c.check("https://other.org/c")
        assert c.fetches == ["https://example.org/robots.txt", "https://other.org/robots.txt"]

    def test_a_malformed_url_does_not_read_as_a_refusal(self):
        # A bad config value is our fault. Blocking here would report "the
        # site disallows us" about a site we never contacted.
        d = StubChecker("").check("not-a-url")
        assert d.allowed
        assert d.uncertain
        assert "url" in d.reason.lower()
