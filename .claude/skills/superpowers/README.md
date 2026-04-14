# Superpowers Framework

**Source:** [obra/superpowers](https://github.com/obra/superpowers)
**Version:** 5.0.7 | **License:** MIT

## What It Provides

An agentic skills framework for structured software development. Superpowers guides development through a complete lifecycle with quality gates at each step.

## Core Philosophy

- **Systematic over ad-hoc** — follow a repeatable process
- **Test-driven** — RED-GREEN-REFACTOR as the core development loop
- **Plan before executing** — understand requirements, design solution, get approval
- **Verify before completing** — evidence-based confirmation, not assumptions
- **Complexity reduction** — YAGNI principle, minimal viable implementation

## 14 Core Skills

| Skill | Purpose |
|-------|---------|
| **writing-plans** | Create detailed implementation plans with checkbox tracking |
| **executing-plans** | Follow plans step-by-step with verification |
| **test-driven-development** | RED-GREEN-REFACTOR cycle |
| **systematic-debugging** | Root-cause analysis with evidence gathering |
| **requesting-code-review** | Prepare code for review with context |
| **receiving-code-review** | Process review feedback systematically |
| **brainstorming** | Structured ideation and option exploration |
| **dispatching-parallel-agents** | Coordinate subagent work |
| **subagent-driven-development** | Delegate tasks to specialized subagents |
| **using-git-worktrees** | Parallel branch development |
| **finishing-a-development-branch** | Branch completion checklist |
| **verification-before-completion** | Final quality gate |
| **using-superpowers** | Meta: how to invoke the framework |
| **writing-skills** | Meta: create new custom skills |

## Usage in This Project

Superpowers is the **primary workflow orchestrator**. Its methodology is embedded in:
- `/plan` command — feature planning
- `/tdd` command — test-driven development
- `/debug` command — systematic debugging
- `/review` command — code review pipeline

### Plan Format

Plans follow the format already established in this project (see `grocery-storefront/docs/superpowers/plans/`):

```markdown
# Feature Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development...

**Goal:** [one sentence]
**Architecture:** [key design decisions]
**Tech Stack:** [relevant technologies]

### Task 1: [Task Name]
**Files:** [files to modify]
- [ ] Step 1: ...
- [ ] Step 2: ...
```

## Full Installation (Optional)

```bash
# Via Claude Code plugin marketplace
/plugin install superpowers@claude-plugins-official
```
