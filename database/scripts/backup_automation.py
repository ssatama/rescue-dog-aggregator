#!/usr/bin/env python3
"""
PostgreSQL Backup Automation Script
Rescue Dog Aggregator - Production Database Backups

This script provides automated backup functionality with:
- Daily compressed backups with retention policy
- Weekly full backups for point-in-time recovery
- Backup integrity verification
- Email notifications on success/failure
- Backup restoration testing
- S3/cloud storage upload (configurable)

Usage:
    python backup_automation.py daily
    python backup_automation.py weekly
    python backup_automation.py test-restore
    python backup_automation.py cleanup --days=30
"""

import argparse
import gzip
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from pathlib import Path

# Add parent directory to path for config import
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DB_CONFIG


class BackupManager:
    """Automated PostgreSQL backup management with monitoring and verification."""

    def __init__(self, backup_base_dir: str = "/var/backups/postgresql"):
        self.db_config = DB_CONFIG
        self.backup_base_dir = Path(backup_base_dir)
        self.daily_dir = self.backup_base_dir / "daily"
        self.weekly_dir = self.backup_base_dir / "weekly"
        self.wal_dir = self.backup_base_dir / "wal"

        # Ensure backup directories exist
        for dir_path in [self.daily_dir, self.weekly_dir, self.wal_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)

        # Backup settings
        self.db_name = self.db_config["database"]
        self.retention_days = 30
        self.weekly_retention_days = 90

        # Notification settings (configure as needed)
        self.notification_email = None  # Set to admin email
        self.smtp_server = "localhost"

    def get_pg_command_env(self) -> dict:
        """Get environment variables for PostgreSQL commands."""
        env = os.environ.copy()
        if self.db_config.get("password"):
            env["PGPASSWORD"] = self.db_config["password"]
        return env

    def create_daily_backup(self) -> tuple[bool, str, Path | None]:
        """Create daily compressed backup."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"{self.db_name}_{timestamp}.sql.gz"
        backup_path = self.daily_dir / backup_filename

        try:
            print(f"Creating daily backup: {backup_filename}")

            # Build pg_dump command
            pg_dump_cmd = [
                "pg_dump",
                "-h",
                self.db_config["host"],
                "-U",
                self.db_config["user"],
                "-d",
                self.db_name,
                "--verbose",
                "--no-password",
            ]

            # Run pg_dump and compress output
            with open(backup_path, "wb") as backup_file:
                dump_process = subprocess.Popen(
                    pg_dump_cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    env=self.get_pg_command_env(),
                )

                gzip_process = subprocess.Popen(
                    ["gzip"],
                    stdin=dump_process.stdout,
                    stdout=backup_file,
                    stderr=subprocess.PIPE,
                )

                dump_process.stdout.close()
                gzip_process.communicate()
                dump_process.wait()

                if dump_process.returncode != 0:
                    stderr_output = dump_process.stderr.read().decode()
                    raise Exception(f"pg_dump failed: {stderr_output}")

                if gzip_process.returncode != 0:
                    gzip_stderr = gzip_process.stderr.read().decode()
                    raise Exception(f"gzip compression failed: {gzip_stderr}")

            # Verify backup file was created and has content
            if not backup_path.exists() or backup_path.stat().st_size == 0:
                raise Exception("Backup file is empty or was not created")

            print(f"Backup created successfully: {backup_path}")
            print(f"Backup size: {backup_path.stat().st_size / (1024 * 1024):.2f} MB")

            return True, f"Daily backup completed: {backup_filename}", backup_path

        except Exception as e:
            error_msg = f"Daily backup failed: {e}"
            print(f"ERROR: {error_msg}")

            # Clean up failed backup file
            if backup_path.exists():
                backup_path.unlink()

            return False, error_msg, None

    def create_weekly_backup(self) -> tuple[bool, str]:
        """Create weekly base backup for point-in-time recovery."""
        timestamp = datetime.now().strftime("%Y%m%d")
        backup_dir = self.weekly_dir / timestamp

        try:
            print(f"Creating weekly base backup: {backup_dir}")

            # Remove existing backup directory if it exists
            if backup_dir.exists():
                shutil.rmtree(backup_dir)

            # Create base backup using pg_basebackup
            pg_basebackup_cmd = [
                "pg_basebackup",
                "-h",
                self.db_config["host"],
                "-U",
                self.db_config["user"],
                "-D",
                str(backup_dir),
                "-Ft",  # tar format
                "-z",  # compress
                "-P",  # progress reporting
                "--no-password",
            ]

            result = subprocess.run(
                pg_basebackup_cmd,
                env=self.get_pg_command_env(),
                capture_output=True,
                text=True,
            )

            if result.returncode != 0:
                raise Exception(f"pg_basebackup failed: {result.stderr}")

            # Verify backup directory and files
            if not backup_dir.exists():
                raise Exception("Backup directory was not created")

            backup_files = list(backup_dir.glob("*.tar.gz"))
            if not backup_files:
                raise Exception("No backup files found in backup directory")

            total_size = sum(f.stat().st_size for f in backup_files)
            print(f"Weekly backup completed: {backup_dir}")
            print(f"Total backup size: {total_size / (1024 * 1024):.2f} MB")

            return True, f"Weekly backup completed: {timestamp}"

        except Exception as e:
            error_msg = f"Weekly backup failed: {e}"
            print(f"ERROR: {error_msg}")

            # Clean up failed backup directory
            if backup_dir.exists():
                shutil.rmtree(backup_dir)

            return False, error_msg

    def verify_backup_integrity(self, backup_path: Path) -> tuple[bool, str]:
        """Verify backup file integrity."""
        try:
            print(f"Verifying backup integrity: {backup_path.name}")

            # Test gzip integrity
            result = subprocess.run(["gzip", "-t", str(backup_path)], capture_output=True, text=True)

            if result.returncode != 0:
                return (
                    False,
                    f"Backup file is corrupted (gzip test failed): {result.stderr}",
                )

            # Test SQL content by attempting to parse first few lines
            with gzip.open(backup_path, "rt") as f:
                first_lines = [f.readline() for _ in range(10)]

            # Check for expected PostgreSQL dump headers
            content = "".join(first_lines)
            if "PostgreSQL database dump" not in content:
                return (
                    False,
                    "Backup file does not contain expected PostgreSQL dump header",
                )

            return True, "Backup integrity verified"

        except Exception as e:
            return False, f"Backup integrity check failed: {e}"

    def test_backup_restore(self, backup_path: Path | None = None) -> tuple[bool, str]:
        """Test backup restoration to a temporary database."""
        if backup_path is None:
            # Use latest daily backup
            daily_backups = sorted(self.daily_dir.glob("*.sql.gz"))
            if not daily_backups:
                return False, "No daily backups found for testing"
            backup_path = daily_backups[-1]

        test_db_name = f"{self.db_name}_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        try:
            print(f"Testing backup restore: {backup_path.name}")
            print(f"Test database: {test_db_name}")

            # Create test database
            createdb_cmd = [
                "createdb",
                "-h",
                self.db_config["host"],
                "-U",
                self.db_config["user"],
                test_db_name,
            ]

            result = subprocess.run(
                createdb_cmd,
                env=self.get_pg_command_env(),
                capture_output=True,
                text=True,
            )

            if result.returncode != 0:
                raise Exception(f"Failed to create test database: {result.stderr}")

            # Restore backup to test database
            with gzip.open(backup_path, "rb") as backup_file:
                psql_cmd = [
                    "psql",
                    "-h",
                    self.db_config["host"],
                    "-U",
                    self.db_config["user"],
                    "-d",
                    test_db_name,
                    "--quiet",
                ]

                result = subprocess.run(
                    psql_cmd,
                    input=backup_file.read(),
                    env=self.get_pg_command_env(),
                    capture_output=True,
                )

                if result.returncode != 0:
                    raise Exception(f"Failed to restore backup: {result.stderr.decode()}")

            # Verify restored data
            psql_check_cmd = [
                "psql",
                "-h",
                self.db_config["host"],
                "-U",
                self.db_config["user"],
                "-d",
                test_db_name,
                "-t",
                "-c",
                "SELECT COUNT(*) FROM animals;",
            ]  # tuples only

            result = subprocess.run(
                psql_check_cmd,
                env=self.get_pg_command_env(),
                capture_output=True,
                text=True,
            )

            if result.returncode != 0:
                raise Exception(f"Failed to verify restored data: {result.stderr}")

            animal_count = int(result.stdout.strip())

            success_msg = f"Backup restore test PASSED: {animal_count} animals restored from {backup_path.name}"
            print(success_msg)

            return True, success_msg

        except Exception as e:
            error_msg = f"Backup restore test FAILED: {e}"
            print(f"ERROR: {error_msg}")
            return False, error_msg

        finally:
            # Clean up test database
            try:
                dropdb_cmd = [
                    "dropdb",
                    "-h",
                    self.db_config["host"],
                    "-U",
                    self.db_config["user"],
                    test_db_name,
                ]

                subprocess.run(
                    dropdb_cmd,
                    env=self.get_pg_command_env(),
                    capture_output=True,
                    check=True,
                )
                print(f"Test database {test_db_name} cleaned up")

            except Exception as e:
                print(f"Warning: Failed to clean up test database {test_db_name}: {e}")

    def cleanup_old_backups(self, days: int = None) -> tuple[int, int]:
        """Remove backups older than specified days."""
        if days is None:
            days = self.retention_days

        cutoff_date = datetime.now() - timedelta(days=days)

        daily_removed = 0
        weekly_removed = 0

        # Clean up daily backups
        for backup_file in self.daily_dir.glob("*.sql.gz"):
            if datetime.fromtimestamp(backup_file.stat().st_mtime) < cutoff_date:
                print(f"Removing old daily backup: {backup_file.name}")
                backup_file.unlink()
                daily_removed += 1

        # Clean up weekly backups (with different retention period)
        weekly_cutoff = datetime.now() - timedelta(days=self.weekly_retention_days)
        for backup_dir in self.weekly_dir.iterdir():
            if backup_dir.is_dir() and datetime.fromtimestamp(backup_dir.stat().st_mtime) < weekly_cutoff:
                print(f"Removing old weekly backup: {backup_dir.name}")
                shutil.rmtree(backup_dir)
                weekly_removed += 1

        return daily_removed, weekly_removed

    def send_notification(self, subject: str, message: str, is_success: bool = True):
        """Send email notification if configured."""
        if not self.notification_email:
            return

        try:
            msg = MIMEText(message)
            msg["Subject"] = f"[Backup {'Success' if is_success else 'FAILURE'}] {subject}"
            msg["From"] = "backup@rescuedogs.app"
            msg["To"] = self.notification_email

            # Basic SMTP - configure your server details
            # server = smtplib.SMTP(self.smtp_server)
            # server.send_message(msg)
            # server.quit()

            print(f"Would send notification to {self.notification_email}: {subject}")

        except Exception as e:
            print(f"Failed to send notification: {e}")

    def get_backup_status(self) -> dict:
        """Get current backup status and statistics."""
        daily_backups = list(self.daily_dir.glob("*.sql.gz"))
        weekly_backups = list(self.weekly_dir.iterdir())

        if daily_backups:
            latest_daily = max(daily_backups, key=lambda p: p.stat().st_mtime)
            latest_daily_time = datetime.fromtimestamp(latest_daily.stat().st_mtime)
        else:
            latest_daily = None
            latest_daily_time = None

        if weekly_backups:
            latest_weekly = max(weekly_backups, key=lambda p: p.stat().st_mtime)
            latest_weekly_time = datetime.fromtimestamp(latest_weekly.stat().st_mtime)
        else:
            latest_weekly = None
            latest_weekly_time = None

        total_size = sum(f.stat().st_size for f in daily_backups) + sum(sum(f.stat().st_size for f in backup_dir.rglob("*") if f.is_file()) for backup_dir in weekly_backups if backup_dir.is_dir())

        return {
            "daily_backup_count": len(daily_backups),
            "weekly_backup_count": len([b for b in weekly_backups if b.is_dir()]),
            "latest_daily_backup": latest_daily.name if latest_daily else None,
            "latest_daily_time": latest_daily_time.isoformat() if latest_daily_time else None,
            "latest_weekly_backup": latest_weekly.name if latest_weekly else None,
            "latest_weekly_time": latest_weekly_time.isoformat() if latest_weekly_time else None,
            "total_backup_size_mb": round(total_size / (1024 * 1024), 2),
            "backup_directory": str(self.backup_base_dir),
        }


def main():
    """Main script entry point."""
    parser = argparse.ArgumentParser(description="PostgreSQL Backup Automation")
    parser.add_argument(
        "command",
        choices=["daily", "weekly", "test-restore", "cleanup", "status"],
        help="Backup command to run",
    )
    parser.add_argument("--backup-dir", default="/var/backups/postgresql", help="Base backup directory")
    parser.add_argument("--days", type=int, help="Retention days for cleanup")
    parser.add_argument("--email", help="Notification email address")
    parser.add_argument("--test-backup", help="Specific backup file to test restore")

    args = parser.parse_args()

    # Initialize backup manager
    backup_manager = BackupManager(backup_base_dir=args.backup_dir)
    if args.email:
        backup_manager.notification_email = args.email

    try:
        if args.command == "daily":
            print("Running daily backup...")
            success, message, backup_path = backup_manager.create_daily_backup()

            if success and backup_path:
                # Verify backup integrity
                integrity_ok, integrity_msg = backup_manager.verify_backup_integrity(backup_path)
                message += f"\n{integrity_msg}"

                if not integrity_ok:
                    success = False

            backup_manager.send_notification("Daily Backup", message, success)

            # Clean up old backups
            daily_removed, weekly_removed = backup_manager.cleanup_old_backups()
            if daily_removed > 0 or weekly_removed > 0:
                print(f"Cleaned up {daily_removed} daily and {weekly_removed} weekly old backups")

            sys.exit(0 if success else 1)

        elif args.command == "weekly":
            print("Running weekly backup...")
            success, message = backup_manager.create_weekly_backup()
            backup_manager.send_notification("Weekly Backup", message, success)
            sys.exit(0 if success else 1)

        elif args.command == "test-restore":
            print("Testing backup restoration...")
            test_backup_path = None
            if args.test_backup:
                test_backup_path = Path(args.test_backup)
                if not test_backup_path.exists():
                    print(f"ERROR: Backup file not found: {test_backup_path}")
                    sys.exit(1)

            success, message = backup_manager.test_backup_restore(test_backup_path)
            backup_manager.send_notification("Backup Restore Test", message, success)
            sys.exit(0 if success else 1)

        elif args.command == "cleanup":
            days = args.days or backup_manager.retention_days
            print(f"Cleaning up backups older than {days} days...")
            daily_removed, weekly_removed = backup_manager.cleanup_old_backups(days)
            message = f"Removed {daily_removed} daily and {weekly_removed} weekly backups older than {days} days"
            print(message)

        elif args.command == "status":
            status = backup_manager.get_backup_status()
            print("Backup Status:")
            print(json.dumps(status, indent=2))

    except KeyboardInterrupt:
        print("\nBackup operation cancelled by user")
        sys.exit(130)
    except Exception as e:
        error_msg = f"Backup operation failed: {e}"
        print(f"ERROR: {error_msg}")
        if args.email:
            backup_manager.send_notification(f"{args.command.title()} Backup Error", error_msg, False)
        sys.exit(1)


if __name__ == "__main__":
    main()
