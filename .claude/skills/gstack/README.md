# gstack — Cherry-Picked Capabilities

**Source:** [garrytan/gstack](https://github.com/garrytan/gstack)
**License:** MIT

## What's Included (and Why)

We cherry-pick TWO unique capabilities from gstack that don't overlap with Superpowers or ECC:

### 1. Browser Automation QA
- Real browser testing via Playwright (already in our project)
- Visual regression detection
- Mobile viewport testing patterns
- Accessibility auditing via browser
- **Why included:** Unique capability — no other framework provides real browser QA

### 2. Sprint Phase Management
- Structured sprint cycle: Think → Plan → Build → Review → Test → Ship → Reflect
- Sprint scoping and prioritization
- Retrospective methodology
- **Why included:** Macro-level project management that complements Superpowers' micro-level feature planning

## What's Excluded (Overlap)

| gstack Feature | Excluded Because |
|----------------|-----------------|
| Planning skills | Superpowers `/plan` covers this |
| Code review | Superpowers `/review` covers this |
| Architecture review | ECC agents cover this |
| Design skills | UI-UX Pro Max covers this |
| ngrok tunneling | Not needed for this project |
| Bun CLI server | Different runtime, not needed |

## Usage

Invoke via:
- `/sprint` — Sprint phase management
- `/qa` — Browser automation QA
- `/ship` — Deployment workflow

## Full Installation (Optional)

```bash
git clone https://github.com/garrytan/gstack.git
cd gstack && ./setup
```

Requires Bun v1.0+ for the full toolkit.
