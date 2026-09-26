# Curiofold Engineering Status

**Current phase:** Production-shaped walking skeleton and reader purchase journey
**Current milestone:** 4.2 — Contextual auth, top-up and unlock preserve momentum
**Health:** At Risk — the credit-backed Story journey and fixed €1.30 direct purchase path are implemented but not live-Preview accepted. Milestone 3.3 separately waits for OD-010 on already-spent credits.

## In progress

- The fixed €1.30 direct Story purchase now has a distinct Story-linked order, server-owned 130-cent quote, Stripe Checkout route, provider-confirmed entitlement fulfilment without wallet credits, and a two-option Story Detail UI. The existing credit top-up and one-credit unlock remain intact. Protected Preview and live webhook acceptance still need end-to-end validation. CRFD-37 remains held behind OD-010.

## In review

- S1-09 — The structured Story, locale, revision and source contract is merged; final closure waits for the public/Reader vertical slice to consume it.
- S1-10 — The semantic token system and accessible responsive application shell pass local code, accessibility, build and four-width browser validation; final visual acceptance remains dependent on renewed Figma inspection.
- S1-11 — PR #9 merged the public Story Detail route, safe preview projection, missing-locale handling and SEO/share metadata. The nonproduction database is now seeded; authenticated acceptance of the protected Preview route remains unverified.
- S1-08 — PR #10 merged the provider-independent identity/session boundary, database-owned roles, allowlisted force redirects and signed/idempotent lifecycle projection. Local, CI and protected-preview provider-free validation pass; live Clerk session/revocation validation remains externally blocked.
- S1-12 — PR #11 merged the provider-independent entitlement and Reader boundary: unique/auditable Story ownership, owner-only retrieval, private response policy, structured semantic rendering, accessible sources and simple reading controls. Local, CI, PostgreSQL 18 and protected-preview provider-free gates pass; live entitled preview evidence remains externally blocked.
- S1-13 — PR #12 merged weighted progress, stable resume anchors, monotonic sequence handling, durable completion, correction fallback and offline retry. Local, CI, protected-preview and PostgreSQL 18 provider-free gates pass; live refresh/session/reconnect evidence remains externally blocked.

## Recently completed

- CRFD-49 / Milestone 4.2 — PR #37 preserved validated Story and payment-order context across Credits sign-in, including session expiry on Checkout return. All seven hosted gates passed and the change is merged into `development`.
- CRFD-48 / Milestone 4.2 — PR #36 connected Story Detail to server-verified ownership, locale-aware reading state, wallet balance and the atomic one-credit unlock API. Anonymous sign-in and zero-credit recovery retain Story context; Reader navigation waits for confirmed entitlement. Local unit, build and browser checks plus all seven hosted gates passed; live development-provider acceptance remains pending.
- CRFD-46 / Milestone 4.2 — PR #34 merged the Add Credits surface, canonical top-up quotes, Stripe test Checkout handoff and owner-scoped order status on return. The UI never treats a redirect as payment fulfilment. All hosted checks passed; live test payment/webhook acceptance remains pending.
- CRFD-45 / Milestone 4.2 — PR #33 merged the authenticated Account wallet balance and recent ledger activity, including empty and temporary-unavailable states. All hosted checks passed; live Clerk session acceptance remains pending.
- S1-07 nonproduction database bootstrap — Applied all 15 tracked migrations to the named Frankfurt `curiofold-nonproduction` project and ran the guarded synthetic catalogue seed. Read-only Neon verification found one Story and one published locale. Authenticated protected-Preview route acceptance remains pending.
- CRFD-44 — PR #31 merged Reader completion actions that appear only when durable progress reports completion; readers can return to the Library or public discovery.
- CRFD-43 — PR #30 merged a labelled native progress indicator on in-progress Library cards.
- CRFD-42 / S1-13A — PR #28 merged an entitlement-backed Reader Library. It derives unread, in-progress and completed state from authoritative active entitlements and reading progress, excludes revoked or unpublished Stories, and provides safe unauthenticated, disabled-account and unavailable-data states. All hosted checks, including isolated PostgreSQL integration and responsive-browser validation, passed. Live session acceptance remains subject to the existing Clerk development configuration.
- CRFD-40 / S1-11B — PR #27 merged locale-scoped PostgreSQL full-text published-Story search with bounded, metadata-only results, query validation and an accessible public search surface. All hosted checks passed.
- CRFD-38 / S1-07A — PR #23 merged a production-refusing, idempotent synthetic Story catalogue seed after all hosted checks passed, including isolated PostgreSQL integration and responsive-browser validation. The separate nonproduction Neon migration/bootstrap remains intentionally unverified.
- CRFD-39 / S1-11A — PR #25 merged the bounded published-Story catalogue query and accessible home discovery cards after all hosted checks passed. The home now has a real catalogue surface when nonproduction data is seeded and a safe empty state otherwise.
- CRFD-36 / Milestone 3.3B — PR #22 merged atomic, idempotent removal of unspent payment-origin credits with wallet/lot locks, compensating ledger entries, explicit `policy_required` handling, audit/outbox evidence and reversal-aware reconciliation after all seven hosted checks passed.
- CRFD-35 / Milestone 3.3A — PR #21 merged immutable refund/dispute/support-correction evidence, idempotent creation, cumulative amount/credit limits and transition policy to `development` after all seven hosted checks passed.
- CRFD-33 / Milestone 3.2D — PR #20 merged owner-scoped payment status, canonical amount-based EUR pricing, durable reconciliation jobs, the Stripe worker and protected scheduler endpoint to `development` after all seven hosted checks passed. The obsolete public pack-catalogue contract was removed.
- CRFD-32 / Milestone 3.2C — PR #19 merged signed Stripe event verification, immutable provider-event deduplication, authoritative provider re-read and atomic order/grant/ledger/audit/outbox fulfilment after all seven GitHub gates passed. Concurrent replay, delayed retry and out-of-order non-regression pass against PostgreSQL 18; no live webhook configuration was enabled.
- CRFD-31 / Milestone 3.2B — PR #18 merged the server-owned credit-pack catalogue, authenticated idempotent Stripe Checkout creation, context-preserving processing/cancel returns, open-session retry, atomic provider-session attachment and redacted provider failures after all seven GitHub gates passed. No live pricing, credentials or redirect-based fulfilment was introduced.
- CRFD-30 / Milestone 3.2A — PR #17 established the provider-independent payment-order aggregate, immutable server-owned commercial snapshot, safe return-path policy, explicit non-regressive state transitions and payment-provider port with PostgreSQL 18 concurrency and upgrade evidence. No live pack price, Stripe key or production payment configuration was introduced.
- CRFD-24 / S1-10A — PR #16 operationalized responsive/cross-browser checks against real Story Detail, Reader and shell components in Chromium, Firefox and WebKit. The executable gate covers the full width matrix, an arbitrary width, overflow, expanded Portuguese labels, keyboard order, reduced motion, touch/coarse-pointer and landscape behavior; manual physical-device and assistive-technology evidence remains an explicit release gate.
- CRFD-22 / Milestone 3.1C — PR #15 merged read-only paginated wallet reconciliation and customer-safe authenticated balance/history after all six GitHub gates passed, completing the provider-independent Milestone 3.1 accounting scope.
- CRFD-23 / Milestone 3.1B — PR #14 merged atomic one-credit Story unlock, FIFO allocation, immutable idempotency evidence and the authenticated unlock API after all six GitHub gates passed.
- CRFD-21 / Milestone 3.1A — PR #13 merged the provider-independent append-only wallet ledger and idempotent credit-grant transaction with PostgreSQL constraints, row locks, immutable provenance and real PostgreSQL 18 concurrency evidence.
- S1-01 — Approved plan and execution controls merged in PR #1.
- S1-02 — Foundational ADR set merged in PR #1.
- S1-03 — Workspace and modular boundaries validated locally.
- S1-04 — PR quality and security gates merged in PR #3.
- S1-05 — Typed environment and client-bundle controls merged in PR #3.
- S1-06 — Persistence, migrations and isolated database-test foundations merged in PR #4.
- Neon nonproduction project provisioned in Frankfurt; resource inventory recorded in `ENVIRONMENTS.md`.
- Vercel nonproduction project linked to GitHub and its protected preview build smoke-tested successfully.
- Nonproduction environment inventory and CI hardening merged in PR #5.
- `StoryDocument@v1`, immutable revision projection and fail-closed publication lookup merged in PR #6.
- S1-14 baseline observability, health/readiness, security headers and threat-model evidence completed in PR #7.
- Linear roadmap materialized with five Projects, 18 Milestones and the first-stage issues.

## Blocked

- Direct Story purchase cannot be declared complete until its provider-confirmed entitlement path, refund/reversal behavior, and two-option UI pass protected Preview money and access-control tests. Live production commerce still waits for OD-007.
- Linear cycle creation is subject to the workspace exposing cycle-management capability.
- Visual acceptance remains dependent on renewed structured access to the Curiofold Figma file.
- Final spent-credit behavior for refunds and chargebacks is gated by OD-010. CRFD-35 and the unspent-credit portion of CRFD-36 can proceed independently.
- Production infrastructure, live payment configuration and the initial production release remain explicit product-owner approval boundaries.

## Environment state

- Vercel Preview has development Clerk, Stripe test-mode and Neon nonproduction variables configured. The named Neon project now has 18 applied migrations, including the direct Story purchase schema, and one seeded synthetic Story; protected-Preview route acceptance remains unverified.
- The stable nonproduction integration branch is `development`; `main` remains the production/release branch.
- No production Neon project, live Stripe configuration or production release has been created.

## Known non-blocking risk

- The dependency audit reports GHSA-67mh-4wv8-2f99 at Moderate severity in a development-only `esbuild` copy nested under the latest available `drizzle-kit`. It is not shipped with the application or exposed as a development server. The High/Critical CI gate passes; update when Drizzle Kit removes the transitive loader rather than forcing an unverified override.

## Next

1. Verify the protected Preview Story Detail route with an authenticated Vercel session and confirm that its database variables point to the bootstrapped nonproduction project.
2. Exercise both payment paths on the protected Preview: direct €1.30 purchase and credit top-up → one-credit unlock, each ending in Reader ownership and durable progress. Record evidence and fix integration defects.
3. Close Milestone 4.2 and the walking-skeleton gate only after live development-provider, authorization and progress acceptance, not merely green provider-free tests.
4. Obtain the OD-010 product/legal decision before starting CRFD-37; options remain negative balance, spending suspension, entitlement revocation or manual review.
5. Complete S1-10 visual acceptance when structured Figma access returns.
6. Retain live Clerk, Stripe and entitled-preview acceptance gates until their development integrations are available.
7. Do not provision production infrastructure or enable live payments without explicit product-owner approval.

## Open decisions

See `docs/project/OPEN_DECISIONS.md`. No open product decision blocks the foundation stage.

**Last updated:** 2026-09-26
