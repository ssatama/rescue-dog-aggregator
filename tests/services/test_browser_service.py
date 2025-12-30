"""Tests for browser service.

Tests the centralized browser factory that auto-detects environment
(local vs Browserless remote).
"""

import os
from unittest.mock import MagicMock, patch

import pytest

from services.browser_service import (
    DEFAULT_USER_AGENTS,
    BrowserOptions,
    BrowserResult,
    BrowserService,
    get_browser_service,
)


class TestBrowserOptions:
    """Tests for BrowserOptions dataclass."""

    def test_default_values(self):
        """BrowserOptions has sensible defaults."""
        opts = BrowserOptions()

        assert opts.headless is True
        assert opts.window_size == (1920, 1080)
        assert opts.user_agent is None
        assert opts.random_user_agent is True
        assert opts.page_load_timeout == 60
        assert opts.implicit_wait == 10
        assert opts.stealth_mode is False
        assert opts.disable_images is False
        assert opts.extra_arguments == []

    def test_custom_values(self):
        """BrowserOptions accepts custom values."""
        opts = BrowserOptions(
            headless=False,
            window_size=(1366, 768),
            user_agent="CustomAgent/1.0",
            page_load_timeout=30,
            stealth_mode=True,
        )

        assert opts.headless is False
        assert opts.window_size == (1366, 768)
        assert opts.user_agent == "CustomAgent/1.0"
        assert opts.page_load_timeout == 30
        assert opts.stealth_mode is True


class TestBrowserResult:
    """Tests for BrowserResult dataclass."""

    def test_quit_calls_driver_quit(self):
        """BrowserResult.quit() calls driver.quit()."""
        mock_driver = MagicMock()
        result = BrowserResult(driver=mock_driver, supports_cdp=True, is_remote=False)

        result.quit()

        mock_driver.quit.assert_called_once()

    def test_quit_handles_exception(self):
        """BrowserResult.quit() handles exceptions gracefully."""
        mock_driver = MagicMock()
        mock_driver.quit.side_effect = Exception("Connection closed")
        result = BrowserResult(driver=mock_driver, supports_cdp=True, is_remote=False)

        result.quit()


class TestBrowserServiceModeDetection:
    """Tests for browser service environment detection."""

    def test_local_mode_when_no_env_vars(self):
        """Service uses local mode when BROWSER_WEBDRIVER_ENDPOINT not set."""
        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("BROWSER_WEBDRIVER_ENDPOINT", None)
            os.environ.pop("BROWSER_TOKEN", None)
            service = BrowserService()

            assert service.is_remote_mode is False

    def test_remote_mode_when_endpoint_set(self):
        """Service uses remote mode when BROWSER_WEBDRIVER_ENDPOINT is set."""
        with patch.dict(
            os.environ,
            {
                "BROWSER_WEBDRIVER_ENDPOINT": "wss://browserless.railway.internal/webdriver"
            },
        ):
            service = BrowserService()

            assert service.is_remote_mode is True

    def test_health_check_local_mode(self):
        """Health check returns correct info for local mode."""
        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("BROWSER_WEBDRIVER_ENDPOINT", None)
            service = BrowserService()

            health = service.health_check()

            assert health["mode"] == "local"
            assert health["endpoint"] is None
            assert health["token_configured"] is False

    def test_health_check_remote_mode_with_token(self):
        """Health check returns correct info for remote mode with token."""
        with patch.dict(
            os.environ,
            {
                "BROWSER_WEBDRIVER_ENDPOINT": "wss://browserless.railway.internal/webdriver",
                "BROWSER_TOKEN": "test-token-123",
            },
        ):
            service = BrowserService()

            health = service.health_check()

            assert health["mode"] == "remote"
            assert health["endpoint"] == "wss://browserless.railway.internal/webdriver"
            assert health["token_configured"] is True


class TestBrowserServiceChromeOptions:
    """Tests for Chrome options building."""

    def test_headless_option(self):
        """Headless option is applied correctly."""
        service = BrowserService()

        opts = BrowserOptions(headless=True)
        chrome_opts = service._build_chrome_options(opts)
        args = chrome_opts.arguments

        assert "--headless=new" in args

    def test_non_headless_option(self):
        """Non-headless mode excludes headless argument."""
        service = BrowserService()

        opts = BrowserOptions(headless=False)
        chrome_opts = service._build_chrome_options(opts)
        args = chrome_opts.arguments

        assert "--headless=new" not in args

    def test_window_size_option(self):
        """Window size is applied correctly."""
        service = BrowserService()

        opts = BrowserOptions(window_size=(1366, 768))
        chrome_opts = service._build_chrome_options(opts)
        args = chrome_opts.arguments

        assert "--window-size=1366,768" in args

    def test_custom_user_agent(self):
        """Custom user agent is applied."""
        service = BrowserService()

        opts = BrowserOptions(user_agent="CustomAgent/1.0", random_user_agent=False)
        chrome_opts = service._build_chrome_options(opts)
        args = chrome_opts.arguments

        assert "--user-agent=CustomAgent/1.0" in args

    def test_random_user_agent(self):
        """Random user agent is selected from defaults."""
        service = BrowserService()

        opts = BrowserOptions(random_user_agent=True)
        chrome_opts = service._build_chrome_options(opts)
        args = chrome_opts.arguments

        user_agent_args = [arg for arg in args if arg.startswith("--user-agent=")]
        assert len(user_agent_args) == 1

        selected_agent = user_agent_args[0].replace("--user-agent=", "")
        assert selected_agent in DEFAULT_USER_AGENTS

    def test_stealth_mode_options(self):
        """Stealth mode adds anti-detection arguments."""
        service = BrowserService()

        opts = BrowserOptions(stealth_mode=True)
        chrome_opts = service._build_chrome_options(opts)
        args = chrome_opts.arguments

        assert "--disable-blink-features=AutomationControlled" in args

    def test_disable_images_option(self):
        """Disable images option is applied."""
        service = BrowserService()

        opts = BrowserOptions(disable_images=True)
        chrome_opts = service._build_chrome_options(opts)
        args = chrome_opts.arguments

        assert "--disable-images" in args

    def test_extra_arguments(self):
        """Extra arguments are appended."""
        service = BrowserService()

        opts = BrowserOptions(
            extra_arguments=["--disable-extensions", "--disable-plugins"]
        )
        chrome_opts = service._build_chrome_options(opts)
        args = chrome_opts.arguments

        assert "--disable-extensions" in args
        assert "--disable-plugins" in args

    def test_standard_arguments_always_present(self):
        """Standard security/stability arguments are always present."""
        service = BrowserService()

        opts = BrowserOptions()
        chrome_opts = service._build_chrome_options(opts)
        args = chrome_opts.arguments

        assert "--no-sandbox" in args
        assert "--disable-dev-shm-usage" in args
        assert "--disable-gpu" in args


class TestBrowserServiceLocalDriver:
    """Tests for local driver creation (mocked)."""

    @patch("services.browser_service.webdriver.Chrome")
    def test_create_local_driver_returns_browser_result(self, mock_chrome):
        """Local driver creation returns BrowserResult with correct flags."""
        mock_driver = MagicMock()
        mock_chrome.return_value = mock_driver

        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("BROWSER_WEBDRIVER_ENDPOINT", None)
            service = BrowserService()
            result = service.create_driver(BrowserOptions())

            assert isinstance(result, BrowserResult)
            assert result.driver == mock_driver
            assert result.supports_cdp is True
            assert result.is_remote is False

    @patch("services.browser_service.webdriver.Chrome")
    def test_create_local_driver_configures_timeouts(self, mock_chrome):
        """Local driver is configured with timeouts."""
        mock_driver = MagicMock()
        mock_chrome.return_value = mock_driver

        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("BROWSER_WEBDRIVER_ENDPOINT", None)
            service = BrowserService()
            service.create_driver(BrowserOptions(page_load_timeout=45, implicit_wait=5))

            mock_driver.set_page_load_timeout.assert_called_once_with(45)
            mock_driver.implicitly_wait.assert_called_once_with(5)

    @patch("services.browser_service.webdriver.Chrome")
    def test_stealth_mode_applies_cdp_commands(self, mock_chrome):
        """Stealth mode applies CDP commands for local driver."""
        mock_driver = MagicMock()
        mock_chrome.return_value = mock_driver

        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("BROWSER_WEBDRIVER_ENDPOINT", None)
            service = BrowserService()
            service.create_driver(BrowserOptions(stealth_mode=True))

            mock_driver.execute_cdp_cmd.assert_called()
            mock_driver.execute_script.assert_called()


class TestBrowserServiceRemoteDriver:
    """Tests for remote Browserless driver creation (mocked)."""

    @patch("services.browser_service.webdriver.Remote")
    def test_create_remote_driver_returns_browser_result(self, mock_remote):
        """Remote driver creation returns BrowserResult with correct flags."""
        mock_driver = MagicMock()
        mock_remote.return_value = mock_driver

        with patch.dict(
            os.environ,
            {
                "BROWSER_WEBDRIVER_ENDPOINT": "wss://browserless.railway.internal/webdriver"
            },
        ):
            service = BrowserService()
            result = service.create_driver(BrowserOptions())

            assert isinstance(result, BrowserResult)
            assert result.driver == mock_driver
            assert result.supports_cdp is False
            assert result.is_remote is True

    @patch("services.browser_service.webdriver.Remote")
    def test_create_remote_driver_uses_endpoint(self, mock_remote):
        """Remote driver uses configured endpoint."""
        mock_driver = MagicMock()
        mock_remote.return_value = mock_driver

        endpoint = "wss://browserless.railway.internal/webdriver"
        with patch.dict(os.environ, {"BROWSER_WEBDRIVER_ENDPOINT": endpoint}):
            service = BrowserService()
            service.create_driver(BrowserOptions())

            mock_remote.assert_called_once()
            call_kwargs = mock_remote.call_args
            assert call_kwargs.kwargs["command_executor"] == endpoint

    @patch("services.browser_service.webdriver.Remote")
    def test_remote_driver_does_not_apply_stealth_cdp(self, mock_remote):
        """Remote driver does not attempt CDP stealth commands."""
        mock_driver = MagicMock()
        mock_remote.return_value = mock_driver

        with patch.dict(
            os.environ,
            {
                "BROWSER_WEBDRIVER_ENDPOINT": "wss://browserless.railway.internal/webdriver"
            },
        ):
            service = BrowserService()
            service.create_driver(BrowserOptions(stealth_mode=True))

            mock_driver.execute_cdp_cmd.assert_not_called()


class TestBrowserServiceContextManager:
    """Tests for context manager functionality."""

    @patch("services.browser_service.webdriver.Chrome")
    def test_context_manager_yields_browser_result(self, mock_chrome):
        """Context manager yields BrowserResult."""
        mock_driver = MagicMock()
        mock_chrome.return_value = mock_driver

        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("BROWSER_WEBDRIVER_ENDPOINT", None)
            service = BrowserService()

            with service.get_browser(BrowserOptions()) as browser:
                assert isinstance(browser, BrowserResult)
                assert browser.driver == mock_driver

    @patch("services.browser_service.webdriver.Chrome")
    def test_context_manager_quits_driver_on_exit(self, mock_chrome):
        """Context manager quits driver on normal exit."""
        mock_driver = MagicMock()
        mock_chrome.return_value = mock_driver

        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("BROWSER_WEBDRIVER_ENDPOINT", None)
            service = BrowserService()

            with service.get_browser(BrowserOptions()):
                pass

            mock_driver.quit.assert_called_once()

    @patch("services.browser_service.webdriver.Chrome")
    def test_context_manager_quits_driver_on_exception(self, mock_chrome):
        """Context manager quits driver even when exception occurs."""
        mock_driver = MagicMock()
        mock_chrome.return_value = mock_driver

        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("BROWSER_WEBDRIVER_ENDPOINT", None)
            service = BrowserService()

            with pytest.raises(ValueError):
                with service.get_browser(BrowserOptions()):
                    raise ValueError("Test error")

            mock_driver.quit.assert_called_once()


class TestGetBrowserServiceSingleton:
    """Tests for singleton accessor."""

    def test_get_browser_service_returns_instance(self):
        """get_browser_service returns BrowserService instance."""
        import services.browser_service

        services.browser_service._browser_service_instance = None

        service = get_browser_service()

        assert isinstance(service, BrowserService)

    def test_get_browser_service_returns_same_instance(self):
        """get_browser_service returns the same instance on multiple calls."""
        import services.browser_service

        services.browser_service._browser_service_instance = None

        service1 = get_browser_service()
        service2 = get_browser_service()

        assert service1 is service2
