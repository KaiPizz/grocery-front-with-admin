# /plan — Structured Feature Planning

**Framework:** Superpowers

Create a detailed implementation plan following the Superpowers workflow methodology.

## Instructions

When the user invokes `/plan`, follow this process:

### 1. Understand
- Read the feature request or task description carefully
- Identify all affected files across both apps (admin-panel, grocery-storefront)
- Check for existing patterns, utilities, and components that can be reused
- Ask clarifying questions if requirements are ambiguous

### 2. Design
- Propose a solution at the architecture level
- Consider: Server Component vs Client Component, where state lives, API changes needed
- Identify trade-offs and present alternatives if relevant
- Get explicit approval before proceeding to planning

### 3. Write the Plan
Create a plan document following this format:

```markdown
# [Feature] Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** [one-sentence description]
**Architecture:** [key design decisions]
**Tech Stack:** Next.js 14 App Router, React 18, TypeScript 5.5, Tailwind 3.4

---

### Task 1: [Task Name]
**Files:**
- Modify: `path/to/file.tsx`
- Create: `path/to/new-file.tsx`

- [ ] Step 1: [specific action]
- [ ] Step 2: [specific action]
- [ ] Step 3: Run test to verify

### Task 2: [Task Name]
...
```

### 4. Principles
- Each task should be independently verifiable
- Include test steps (RED-GREEN-REFACTOR where applicable)
- List specific files to modify per task
- Keep tasks small enough for a single focused session
- Save plans to `grocery-storefront/docs/superpowers/plans/` for reference

Reference: `.claude/skills/superpowers/workflow.md`

$ARGUMENTS
