# Verified production release — 22 October 2026

The owner approved deployment, including peak hours. The Asia Deli Go lane has
no peak-hour flag or restriction; no backend restart or migration was needed.

- Exact canonical commit: `e77f0b60548b23ec7d2291055f07d0faa1b27825`.
- Storefront: `storefront-e77f0b60548b-20261022T111301Z`, BUILD_ID
  `45PqXxPkpvK2MIEVHY5rk`.
- Admin: `admin-e77f0b60548b-20261022T111301Z`, BUILD_ID
  `3NcSmDoJiAX8IiZtZIaWv`.
- Source profile: canonical. Live pre-release base was canonical `fc2297f`,
  released separately at 10:25 UTC. Admin, checkout, deployment scripts and DPD
  application source have no delta; fulfillment configuration is unchanged.
- Application bytes match the accepted DEV preview. The subsequent source delta
  is documentation and a stronger stale-response browser test.

## Release evidence

The initial full check-only failed 59/60 before production mutation because an
old test expected a disabled stale pager. The approved UI hides stale rows,
counts and pagination. The revised test waits for both controlled responses and
the rendered current result; removing both stale-response guards makes it fail.
The local source was restored byte-for-byte and the test passed again.

The complete check-only and real guarded release then both passed: 118 admin
unit cases, 104 account contracts, the additional security/static/catalog gates,
zero production dependency audit findings, lint/types, 60 browser cases, both
production builds and standalone smokes. The activation transaction committed
and retained the exact prior immutable releases for recovery.

Independent post-release checks passed:

- 40 real-public-site browser checks: PL/EN navigation at 320/390/1280/1440px,
  cosmetics and kitchenware categories/PDPs on mobile/desktop, all five cuisine
  listings in both languages, independent country filtering, Back navigation,
  and both approved category background SHA-256 values. Browser page-error
  collections stayed empty. Attached screenshots were visually inspected.
- Cuisine counts: JP 376, KR 380, CN 256, TH 169, VN 58. Each cuisine query uses 51
  current food-category IDs before pagination; every first-page product has
  food ancestry. Korean country-only filtering returns 418 merchandise items.
- 7 HTTP/API/auth route checks and all 21 Next.js JS/CSS assets passed. Core health
  was 200, invalid core login 401; clean guest storefront session remains 200 with
  `authenticated:false`, `customer:null`, `NO_SESSION_COOKIE`.
- All four PM2 apps are online. Actual process cwd/manifests/BUILD_IDs match the
  release; only the two ADG services restarted, each once. Backend/frontend
  PID, uptime and restart counters are unchanged, as are all PM2 definitions.
- Five protected SHA-256 fingerprints are unchanged: both runtime env files,
  admin auth state, initialization marker and published admin configuration.
  No database write, migration, payment/shipping config or upload change occurred.

## Log qualification and limits

Fresh admin stderr is empty. Storefront stderr includes the same destination-
stream-closed diagnostic already present before release during rapid browser
navigation; seven fully-read HTTP responses generated no further stream errors.
An existing owner image for ADG-000054 exceeds Next's 2MB data-cache limit, producing
a cache warning on fetch. The image proxy still returns 200 with a valid image
content type; its source/assets were not changed by this release. These are
recorded observations, not an empty-stderr claim.

Verification made no customer/order/payment and did not exercise a real Google
provider login or signed-in production admin workflow. Unchanged admin auth and
revocation were covered by the standalone smoke and protected-state checks.
The 13 physical product/packaging ambiguities and ADG-000119 ingredient conflict
remain separate from this UI release.

Private logs, failure trace, causal controls, process/fingerprint snapshots and
HTTP/artifact evidence: `~/.local/share/enail/adg-catalog-sections-20261022/`.
