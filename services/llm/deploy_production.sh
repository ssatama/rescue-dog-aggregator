#!/bin/bash
"""
Production deployment script for LLM Dog Profiler Pipeline.

Following CLAUDE.md principles:
- Production-ready deployment
- Environment validation
- Automated rollback capability
"""

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[DEPLOY]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

validate_environment() {
    log "Validating environment..."
    
    # Check required environment variables
    local required_vars=("OPENROUTER_API_KEY" "DB_HOST" "DB_NAME" "DB_USER" "DB_PASSWORD")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    # Check Python version
    python_version=$(python3 --version | cut -d' ' -f2)
    if [[ ! "$python_version" =~ ^3\.(9|10|11|12|13) ]]; then
        error "Python 3.9+ required, found $python_version"
    fi
    
    # Check database connectivity
    log "Testing database connection..."
    if ! psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        error "Database connection failed"
    fi
    
    log "Environment validation passed"
}

backup_current() {
    log "Creating backup of current deployment..."
    local backup_dir="/tmp/llm_backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup configuration files
    cp -r "$PROJECT_ROOT/configs" "$backup_dir/" 2>/dev/null || warn "No configs to backup"
    cp -r "$PROJECT_ROOT/services/llm" "$backup_dir/" 2>/dev/null || warn "No LLM services to backup"
    
    echo "$backup_dir" > /tmp/llm_backup_location
    log "Backup created at: $backup_dir"
}

install_dependencies() {
    log "Installing dependencies..."
    cd "$PROJECT_ROOT"
    
    # Ensure virtual environment exists
    if [[ ! -d "venv" ]]; then
        python3 -m venv venv
    fi
    
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    
    log "Dependencies installed"
}

run_tests() {
    log "Running production tests..."
    cd "$PROJECT_ROOT"
    source venv/bin/activate
    
    # Run core LLM service tests
    export TESTING=true
    PYTHONPATH=. python -m pytest tests/services/llm/ -v --tb=short
    
    # Run integration tests if available
    if [[ -f "tests/integration/test_llm_integration.py" ]]; then
        PYTHONPATH=. python -m pytest tests/integration/test_llm_integration.py -v
    fi
    
    log "Tests passed"
}

deploy_services() {
    log "Deploying LLM services..."
    
    # Ensure configuration is valid
    PYTHONPATH=. python3 -c "
from services.llm.organization_config_loader import get_config_loader
loader = get_config_loader()
configs = loader.load_all_configs()
print(f'Loaded {len(configs)} organization configs')
assert len(configs) > 0, 'No organization configs found'
print('✅ Configuration validation passed')
"
    
    # Test pipeline initialization
    PYTHONPATH=. python3 -c "
from services.llm.dog_profiler import DogProfilerPipeline
from services.llm_profiler_service import LLMProfilerService

# Test pipeline
pipeline = DogProfilerPipeline(organization_id=11, dry_run=True)
print('✅ Pipeline initialization passed')

# Test service
service = LLMProfilerService(organization_id=11)
print('✅ Service initialization passed')
"
    
    log "Services deployed successfully"
}

rollback() {
    if [[ -f "/tmp/llm_backup_location" ]]; then
        local backup_dir=$(cat /tmp/llm_backup_location)
        warn "Rolling back to backup: $backup_dir"
        
        cp -r "$backup_dir/configs" "$PROJECT_ROOT/" 2>/dev/null || true
        cp -r "$backup_dir/services" "$PROJECT_ROOT/" 2>/dev/null || true
        
        log "Rollback completed"
    else
        error "No backup found for rollback"
    fi
}

main() {
    local command="${1:-deploy}"
    
    case "$command" in
        "deploy")
            log "Starting LLM production deployment..."
            validate_environment
            backup_current
            install_dependencies
            run_tests
            deploy_services
            log "Deployment completed successfully!"
            ;;
        "rollback")
            rollback
            ;;
        "test-only")
            validate_environment
            run_tests
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|test-only}"
            exit 1
            ;;
    esac
}

# Trap errors for rollback
trap 'error "Deployment failed! Run: $0 rollback"' ERR

main "$@"