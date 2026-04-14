# Sprint Phase Management

## The 7-Phase Sprint Cycle

```
Think → Plan → Build → Review → Test → Ship → Reflect
```

### Phase 1: THINK
**Goal:** Understand what to build and why

- Review product requirements, user feedback, bug reports
- Identify the highest-impact work items
- Consider technical constraints and dependencies
- Timebox: 1 session

**Output:** Prioritized list of work items with rationale

### Phase 2: PLAN
**Goal:** Break work into actionable tasks

- Create implementation plans for each work item (use Superpowers `/plan`)
- Estimate relative complexity (S/M/L)
- Identify dependencies between tasks
- Assign tasks to parallel work streams where possible
- Timebox: 1 session

**Output:** Sprint backlog with plans for each item

### Phase 3: BUILD
**Goal:** Implement the planned work

- Follow the plan step by step
- Use TDD (Superpowers `/tdd`)
- Use subagent-driven development for parallel tasks
- Commit frequently with descriptive messages
- Timebox: majority of sprint

**Output:** Working code with tests

### Phase 4: REVIEW
**Goal:** Verify code quality

- Run code review pipeline (Superpowers `/review`)
- Check TypeScript quality (ECC `/ts-review`)
- Security audit for any API changes (ECC `/security-audit`)
- Timebox: 1 session

**Output:** Reviewed, approved code

### Phase 5: TEST
**Goal:** Verify feature correctness

- Run browser QA (gstack `/qa`)
- Run full E2E test suite
- Test on mobile viewports
- Check for visual regressions
- Timebox: 1 session

**Output:** QA report, all tests passing

### Phase 6: SHIP
**Goal:** Deploy safely

- Pre-flight checklist (gstack `/ship`)
- Deploy to staging first
- Verify staging matches expectations
- Deploy to production
- Monitor for errors post-deploy
- Timebox: 1 session

**Output:** Live deployment

### Phase 7: REFLECT
**Goal:** Learn and improve

- What went well?
- What was harder than expected?
- What should we do differently next sprint?
- Any technical debt to address?
- Update project documentation if needed
- Timebox: 30 minutes

**Output:** Retrospective notes, action items for next sprint

## Sprint Sizing

For this project (single developer + AI):
- **Mini sprint:** 1-2 features, 1-2 days
- **Standard sprint:** 3-5 features, 3-5 days
- **Large sprint:** Major architectural change, 1-2 weeks

## Tracking

Use the sprint phases as mental checkpoints. Mark each phase complete before moving to the next. If a phase reveals issues, it's OK to loop back to an earlier phase.
