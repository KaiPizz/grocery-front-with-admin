# /security-audit — Security Review

**Framework:** ECC (Everything Claude Code)

Run a comprehensive security audit focused on e-commerce threats.

## Instructions

When the user invokes `/security-audit`, perform a security review using the Security Analyst agent guidelines.

### Scope

Review the specified files or recent changes. If no scope specified, audit the most security-critical areas:

1. **Authentication & Session** — `admin-panel/src/lib/auth.ts`, `session.ts`, `middleware.ts`
2. **API Routes** — `admin-panel/src/app/api/` (all route handlers)
3. **File Upload** — `admin-panel/src/app/api/media/upload/`
4. **Environment** — `.env.local` patterns, `NEXT_PUBLIC_*` exposure
5. **CORS** — `admin-panel/next.config.js` headers configuration
6. **GraphQL Proxy** — `grocery-storefront/src/app/api/graphql/`

### Review Process

For each area, check against the Security Analyst checklist (`.claude/agents/security-analyst.md`):

1. **Authentication & Authorization** — API key validation, session integrity
2. **Input Validation** — Zod schemas, file upload checks, URL params
3. **Data Exposure** — Secrets in code, error message leakage
4. **XSS Prevention** — HTML sanitization, CSP headers
5. **CORS & Headers** — Origin validation, security headers
6. **Dependencies** — `npm audit` for known vulnerabilities

### Output Format

```
## Security Audit Report

### Scope
[Files/areas reviewed]

### Findings

| # | Severity | Category | Finding | Location | Recommendation |
|---|----------|----------|---------|----------|----------------|
| 1 | Critical/High/Medium/Low | [category] | [description] | [file:line] | [fix] |

### Summary
- Critical: [count]
- High: [count]
- Medium: [count]
- Low: [count]

### Verdict: [SECURE / ACTION REQUIRED]
```

Reference: `.claude/agents/security-analyst.md`, `.claude/rules/05-security.md`

$ARGUMENTS
