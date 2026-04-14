# Superpowers Development Workflow

## The 5-Phase Cycle

Every feature or task follows this structured workflow:

```
┌─────────────┐     ┌──────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│ 1. UNDERSTAND│────▶│ 2. DESIGN│────▶│ 3. PLAN │────▶│ 4. EXECUTE│────▶│ 5. REVIEW│
│              │     │          │     │         │     │          │     │          │
│ Requirements │     │ Solution │     │ Steps   │     │ Code     │     │ Verify   │
│ Constraints  │     │ Trade-offs│    │ Tasks   │     │ Tests    │     │ Quality  │
│ Context      │     │ Approval │     │ Files   │     │ Subagents│     │ Complete │
└─────────────┘     └──────────┘     └─────────┘     └──────────┘     └──────────┘
```

### Phase 1: Understand

- Read and comprehend the full requirement
- Identify affected files and components
- Note constraints and edge cases
- Ask clarifying questions BEFORE designing
- Search for existing patterns to reuse

### Phase 2: Design

- Propose a solution at the architecture level
- Consider trade-offs and alternatives
- Present the design in digestible chunks
- Get explicit approval before proceeding
- Keep it minimal — avoid over-engineering

### Phase 3: Plan

- Break work into sequential tasks
- Each task lists specific files to modify
- Steps use checkbox syntax for tracking: `- [ ]`
- Include verification steps (run tests, check behavior)
- Plan should be executable by subagents

### Phase 4: Execute

- Follow the plan step by step
- Use TDD: write failing test → implement → verify green
- Use subagents for parallel independent tasks
- Mark checkboxes as completed: `- [x]`
- Stop and re-plan if assumptions prove wrong

### Phase 5: Review

- Run all tests (existing + new)
- Verify each requirement is met with evidence
- Check for regressions in related features
- Review code quality (types, naming, patterns)
- Only mark complete when ALL verification passes

## Key Principles

1. **Don't skip phases** — especially "Understand" and "Review"
2. **Get approval at gates** — between Design/Plan and Execute
3. **Evidence over assumptions** — run the test, don't assume it passes
4. **Smallest viable change** — YAGNI, avoid scope creep
5. **Track progress** — checkbox every step, no batch completions
