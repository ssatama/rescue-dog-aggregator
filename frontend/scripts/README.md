# Development Scripts

Quick utilities for frontend development workflow.

## Scripts

### `dev-reset.sh` 🧹

**What it does:**
- Kills all Next.js/npm dev processes
- Frees ports 3000 and 3001
- Clears `.next`, `node_modules/.cache`, and `.turbo` directories
- Optionally starts dev server

**Usage:**
```bash
# Make executable (first time only)
chmod +x scripts/dev-reset.sh

# Run the script
./scripts/dev-reset.sh

# Or from root directory
cd frontend && ./scripts/dev-reset.sh
```

**When to use:**
- Dev server stuck on wrong port (3001 instead of 3000)
- Build errors after switching branches
- Cache-related issues
- "Port already in use" errors
- Frontend not loading properly

**Options:**
- Uncomment the `node_modules` lines for complete reinstall
- Script will ask if you want to start dev server after cleanup

## Quick Commands

```bash
# Just kill processes (no cache clear)
pkill -f "next-server\|npm.*dev\|node.*dev"

# Just free ports
lsof -ti:3000,3001 | xargs kill -9

# Just clear cache
rm -rf .next node_modules/.cache
```