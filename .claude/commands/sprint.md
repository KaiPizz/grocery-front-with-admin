# /sprint — Sprint Phase Management

**Framework:** gstack

Manage development work in structured sprint phases.

## Instructions

When the user invokes `/sprint`, help manage the current sprint:

### Starting a New Sprint

1. **THINK** — Review what needs to be done:
   - What features, bugs, or improvements are pending?
   - What's the highest impact work?
   - What are the technical constraints?
   - Output: Prioritized work items list

2. **PLAN** — Break into tasks:
   - Create implementation plans for each item (use `/plan` per item)
   - Estimate complexity: S (< 1 hour), M (1-4 hours), L (4+ hours)
   - Identify parallelizable work
   - Output: Sprint backlog

### During a Sprint

Track which phase you're in:

```
[x] Think — Priorities defined
[x] Plan — Backlog created
[ ] Build — Implementing (use /tdd)
[ ] Review — Code review (use /review)
[ ] Test — QA testing (use /qa)
[ ] Ship — Deploy (use /ship)
[ ] Reflect — Retrospective
```

### Sprint Retrospective

After shipping, run a quick retrospective:
- What went well?
- What was harder than expected?
- What should change next sprint?
- Any tech debt to track?

### Sprint Size Guide

| Size | Scope | Duration |
|------|-------|----------|
| Mini | 1-2 small features or bug fixes | 1-2 days |
| Standard | 3-5 features/changes | 3-5 days |
| Large | Major architectural change | 1-2 weeks |

Reference: `.claude/skills/gstack/sprint-phases.md`

$ARGUMENTS
