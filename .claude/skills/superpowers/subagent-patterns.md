# Subagent-Driven Development Patterns

## When to Use Subagents

Use parallel subagents when:
- Tasks are independent (no data dependencies between them)
- Each task modifies different files
- The work can be verified independently
- You want to speed up execution of a multi-task plan

Do NOT use subagents when:
- Tasks depend on each other's output
- Multiple tasks modify the same file
- The task requires sequential decision-making

## Pattern: Parallel Feature Work

When a plan has independent tasks across the two apps:

```
Main Agent (Coordinator)
├── Subagent A: Admin Panel changes
│   └── Modify admin-panel/src/...
├── Subagent B: Storefront changes
│   └── Modify grocery-storefront/src/...
└── Subagent C: Test updates
    └── Modify grocery-storefront/tests/...
```

## Pattern: Test-First Parallel

Write tests and implementation in parallel using worktrees:

```
Main Agent
├── Subagent A (worktree): Write failing tests
│   └── Creates test files based on the plan
├── Subagent B (worktree): Prepare implementation scaffolding
│   └── Creates stubs, types, interfaces
└── Main Agent: Merge and complete implementation
    └── Makes tests pass with real code
```

## Pattern: Multi-Locale Updates

For i18n changes affecting multiple message files:

```
Main Agent
├── Subagent: Update en.json (primary locale)
├── Subagent: Update vi.json
├── Subagent: Update pl.json
└── ... (one per locale)
```

## Coordination Rules

1. **Clear scope** — Each subagent gets explicit files and objectives
2. **No overlap** — Subagents never modify the same files
3. **Verification** — Main agent verifies all subagent work before marking complete
4. **Error handling** — If a subagent fails, main agent investigates before retrying
5. **Plan reference** — Each subagent receives the relevant portion of the plan
