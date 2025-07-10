"""
Emergency operations decomposition package.

This package contains services extracted from the monolithic emergency_operations.py
following Single Responsibility Principle and CLAUDE.md guidelines.

Services:
- SystemMonitoringService: System health monitoring and metrics
- ScraperControlService: Scraper control and emergency stop operations
- RollbackService: Data rollback and snapshot management
- DataRecoveryService: Data recovery and corruption repair
- EmergencyCoordinator: Coordination layer for emergency workflows
"""
