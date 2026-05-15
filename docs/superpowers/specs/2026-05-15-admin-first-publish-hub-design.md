# Admin First Publish Hub Design

## Summary

The first admin UX pass should improve the path from first login to first successful publish without rebuilding the admin panel. The current product already has capable configuration pages, but a new store owner has to infer the correct order of work and cannot see, from one place, whether the storefront is ready to publish.

The chosen approach is to turn `/admin` into a first-publish hub, keep the existing page structure, and extract publish-readiness rules into shared logic so the dashboard and publish actions cannot disagree.

## Problem

The admin panel currently has breadth but weak orchestration:

- Dashboard status cards summarize configuration but do not answer "what should I do next?"
- Setup work is spread across Branding, Homepage, Layout, General, SEO, and Tracking pages.
- Homepage has publish-time image validation that is local to that page, so readiness is not visible from the dashboard and could diverge elsewhere.
- First-time users are forced to understand the system before the system helps them complete the first useful outcome.

This is a workflow problem, not a missing-page problem. Adding a new wizard would duplicate existing pages and create a second admin flow to maintain.

## Goals

1. Let a first-time store owner understand the next setup action within a few seconds of opening `/admin`.
2. Make publish readiness visible before the user reaches a failing publish action.
3. Keep publish rules consistent anywhere publish is triggered.
4. Preserve the existing admin information architecture for returning users.

## Non-Goals

- Building a multi-step onboarding wizard.
- Redesigning every admin page.
- Implementing the five existing stub block editors.
- Adding config version history, rollback, or new backend capabilities.
- Making optional setup items mandatory just to force a visually complete storefront.

## Recommended Approach

### Chosen: Dashboard setup hub

`/admin` becomes a `First Publish Hub` layered on top of the current admin structure:

- A readiness summary at the top of the page.
- One primary next-step action.
- A setup checklist ordered by the real workflow.
- Existing status cards retained lower on the page for returning-user value.

This is the smallest change that solves the actual failure mode. It improves first-run usability while reusing the configuration pages that already exist.

### Rejected: Linear onboarding wizard

A wizard would make first-run setup obvious, but it duplicates six working pages, adds route/state complexity, and becomes dead weight after the first publish. It is only justified if the current pages themselves cannot support setup, which is not the case.

### Rejected: Page-by-page polish only

Improving individual pages would make each page nicer in isolation but would not answer the cross-page question of sequence and readiness. That misses the core problem.

## User Experience

### Dashboard hierarchy

The top of `/admin` should contain:

1. **Readiness summary**
   - Example ready state: `Ready to publish`
   - Example blocked state: `2 issues must be fixed before publish`
   - Example partial state: `Ready to publish, 3 recommended improvements remain`

2. **Primary action**
   - If blocked: `Continue setup`
   - If publishable: `Publish storefront`
   - The action links to the first unresolved blocking setup item or triggers publish when publish is allowed.

3. **Setup checklist**
   - Ordered items:
     1. Branding
     2. Homepage
     3. Layout
     4. General
     5. SEO
     6. Tracking
   - Each item shows:
     - status
     - one-line explanation
     - link to the relevant admin page
   - Tracking remains optional and must never block first publish.

4. **Existing dashboard summary**
   - Current banners, sections, tracking count, and last update cards stay on the page but move below the setup guidance.

### Returning-user behavior

Once the storefront is publishable, the hub should become compact rather than nagging:

- `Ready to publish` stays visible.
- Recommended items remain discoverable but visually secondary.
- Returning users can still navigate directly through the existing configuration grid.

## Readiness Model

Readiness must be computed by a shared helper, not scattered through page components.

### Readiness classes

1. **Blocking**
   - Prevents publish because the live storefront would render an incomplete or invalid experience.
   - Initial rules:
     - Any enabled banner block missing required image assets.
     - Any enabled tracking integration missing its required ID value.

2. **Recommended**
   - Worth fixing, but not severe enough to stop first publish.
   - Initial rules:
     - No uploaded logo.
     - Store name remains the default value `Grocery`.
     - Any of phone, email, or address is empty.
     - SEO title and description still equal the shipped defaults, or canonical URL is empty.

3. **Optional**
   - Useful, but not necessary for first publish.
   - Initial rule:
     - Tracking integrations are disabled.

### Publish contract

- Any publish entry point must consult the same readiness helper.
- Blocking issues disable or reject publish with a clear reason.
- Recommended items remain visible but do not block publish.
- If a rule is important enough to reject publish, it belongs in the shared helper rather than in one page-local handler.

## Proposed Component Boundaries

### Shared readiness logic

Responsibility:

- Read `StorefrontConfig`
- Return ordered setup items, blocking issues, recommended issues, optional items, and the next recommended action

Why:

- Keeps workflow logic testable and independent from React rendering.
- Prevents dashboard and page-level publish behavior from drifting apart.

### Dashboard presentation

Responsibility:

- Render readiness summary
- Render primary next-step CTA
- Render setup checklist
- Keep the existing overview blocks lower on the page

Why:

- The dashboard should orchestrate navigation, not own readiness rules.

### Publish gating integration

Responsibility:

- Reuse shared readiness logic from the publish path before publishing
- Surface the first actionable blocking reason to the user

Why:

- The current homepage-only validation is too narrow. Publish behavior should be consistent even if future publish controls appear elsewhere.

## Data Flow

1. Admin loads draft config through the existing `useConfig()` hook.
2. Dashboard passes the config snapshot into the readiness helper.
3. Helper returns:
   - checklist rows
   - grouped issues by severity
   - first actionable blocking destination
   - whether publishing is allowed
4. Dashboard renders its summary and CTA from that model.
5. Publish flow checks the same helper before calling the existing publish API path.

No config schema change is required.

## Error Handling

- Config load failure keeps the current error treatment and should not show misleading readiness.
- A blocked publish should show:
  - a visible error state near the relevant action
  - the first actionable blocking reason
  - a link or navigation path to fix it
- Existing toast behavior may remain, but it must not be the only feedback channel for a failed publish.

## Testing Strategy

### Unit-level coverage

Add focused tests around the readiness helper for:

- publishable configured state with all required banner assets present
- enabled hero block missing desktop image
- enabled sticky block missing one or both required images
- disabled blocks not producing blockers
- disabled tracking staying optional
- enabled tracking with a missing required ID blocking publish
- recommended issues being reported without blocking publish
- deterministic ordering of next actions

### UI-level coverage

Add admin dashboard coverage for:

- blocked state showing issue count and `Continue setup`
- publishable state showing `Publish storefront`
- checklist links routing to the expected page
- tracking shown as optional rather than blocking

### Regression coverage

- Publish cannot bypass blocking issues detected by the helper.
- Existing draft save and publish behavior still work for publishable configs.

## Acceptance Criteria

1. A first-time store owner can open `/admin` and identify the next setup step without visiting another page first.
2. The dashboard distinguishes blocking, recommended, and optional setup items.
3. Tracking never blocks first publish.
4. Enabled banner blocks with missing required images prevent publish from every publish path that this slice touches.
5. The existing admin configuration pages remain the source of editing; no duplicate wizard flow is introduced.
6. Returning users still have access to the existing dashboard summary and section navigation.

## Risks And Tradeoffs

- **Recommended issue overload:** If too many suggestions are shown, the dashboard becomes another dense page. Keep the initial set small and actionable.
- **False confidence:** The current config schema cannot prove whether every piece of content is "good," only whether it meets basic readiness rules. The UI must not imply a business-quality guarantee it cannot make.
- **Validation drift:** This is the main implementation risk. The shared helper exists specifically to avoid it; page-local special cases should be reduced, not multiplied.

## Open Questions For Later

- Should preview become a stronger part of the dashboard once a real preview workflow exists?
- Should readiness eventually persist a "first publish complete" state, or is live config quality enough to infer the same behavior?
- Should the dashboard later surface product/catalog health from Zyra, once backend data becomes reliable enough to trust?
