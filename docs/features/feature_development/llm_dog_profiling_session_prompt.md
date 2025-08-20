# LLM Dog Profiling - Session Continuation Prompt

## Copy this prompt to start a new Claude Code session:

---

**TASK: Continue LLM Dog Profiling Implementation**

Please continue implementing the LLM-powered dog data enrichment pipeline by:

1. **READ THE PLAN**: Start by reading the implementation plan at `docs/features/feature_development/llm_dog_profiling_implementation_plan.md`

2. **CHECK WORKLOG**: Review the worklog at `docs/features/feature_development/llm_dog_profiling_worklog.md` to understand:
   - What has been completed in previous sessions
   - Current phase and pending tasks
   - Any blockers or issues from last session
   - Metrics and quality gates status
   - Confirm log is correct via git status

3. **EXECUTE NEXT TASKS**: Based on the worklog's "Next Session Goals" and unchecked tasks in the current phase:
   - Follow the implementation plan EXACTLY
   - Use TDD approach (test first, then code)
   - Run tests to verify each step
   - Document any issues encountered

4. **UPDATE WORKLOG**: After completing work (or at regular intervals):
   - Add a new session entry with today's date
   - Check off completed tasks in phase tracking
   - Update quality metrics if applicable
   - Record any API costs incurred
   - Document code files created/modified
   - Note key decisions or learnings
   - Set clear goals for the next session

5. **QUALITY REQUIREMENTS**:
   - ZERO hallucinations in LLM outputs
   - All tests must pass before moving on
   - Follow existing code patterns in the codebase
   - Cost must stay under $0.05 per dog
   - Achieve >80% accuracy before scaling

6. **CRITICAL PATH**: The current priority order is:
   - Phase 1: Infrastructure validation & cost analysis (Days 1-2)
   - Phase 2: Schema & pipeline development (Days 3-5)
   - Phase 3: Testing & monitoring (Days 6-7)
   - Phase 4: Production rollout (Days 8-10)

**IMPORTANT REMINDERS**:
- This is a multi-session project - document everything
- Start with 10 dogs, not 400 - iterative approach
- Include metadata fields (confidence scores, source references)
- Use dry-run mode before any bulk database updates
- Create backups before production changes
- Stop if cost exceeds $0.10 per dog and reassess

**FILE LOCATIONS**:
- Implementation Plan: `docs/features/feature_development/llm_dog_profiling_implementation_plan.md`
- Worklog: `docs/features/feature_development/llm_dog_profiling_worklog.md`
- LLM Service: `services/llm/`
- Tests: `tests/services/llm/`
- Prompts: `prompts/organizations/`
- Organization 11 Config: `configs/tierschutzverein_europa.yaml`

Begin by reading the plan and worklog, then proceed with the next uncompleted tasks. Remember to maintain the worklog as you progress.

---

## Alternative Shorter Version:

Continue the LLM dog profiling implementation:
1. Read `docs/features/feature_development/llm_dog_profiling_implementation_plan.md`
2. Check `docs/features/feature_development/llm_dog_profiling_worklog.md` for progress
3. Execute next unchecked tasks from current phase
4. Update worklog with session entry, completed tasks, and metrics
5. Follow TDD, test everything, document issues
6. Priority: Phase 1 tasks if not complete, then Phase 2, etc.

Key: Start with 10 dogs, <$0.05/dog cost, >80% accuracy, update worklog!

---

## Notes for User:

- Use the full version for the first session after a break
- Use the shorter version for quick continuation sessions
- Always ensure Claude Code reads both documents before starting work
- Remind Claude Code to update the worklog before ending the session
- Check that tests are passing before accepting any implementation
