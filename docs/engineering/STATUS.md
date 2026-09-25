# Curiofold Engineering Status

**Current phase:** Production-shaped walking skeleton with parallel financial-integrity work
**Current milestone:** 3.3 — Reversals and support operations are auditable
**Health:** On Track — Milestone 3.2 and CRFD-35 are merged to `development`; CRFD-36 has a validated atomic unspent-credit reversal implementation. Live provider gates remain intentionally deferred and do not block provider-independent work.

## In progress

- CRFD-36 / Milestone 3.3B — Atomic, idempotent removal of unspent payment-origin credits is implemented with wallet/lot locks, compensating ledger entries, explicit `policy_required` handling for spent units, audit/outbox evidence and reversal-aware reconciliation. Local PostgreSQL 18 concurrency and migration validation pass.

## In review

- S1-09 — The structured Story, locale, revision and source contract is merged; final closure waits for the public/Reader vertical slice to consume it.
- S1-10 — The semantic token system and accessible responsive application shell pass local code, accessibility, build and four-width browser validation; final visual acceptance remains dependent on renewed Figma inspection.
- S1-11 — PR #9 merged the public Story Detail route, safe preview projection, missing-locale handling and SEO/share metadata. Local validation is complete and Vercel deploys the protected preview successfully, but the Story route cannot render there until S1-07 authorizes and supplies the preview database connection.
- S1-08 — PR #10 merged the provider-independent identity/session boundary, database-owned roles, allowlisted force redirects and signed/idempotent lifecycle projection. Local, CI and protected-preview provider-free validation pass; live Clerk session/revocation validation remains externally blocked.
- S1-12 — PR #11 merged the provider-independent entitlement and Reader boundary: unique/auditable Story ownership, owner-only retrieval, private response policy, structured semantic rendering, accessible sources and simple reading controls. Local, CI, PostgreSQL 18 and protected-preview provider-free gates pass; live entitled preview evidence remains externally blocked.
- S1-13 — PR #12 merged weighted progress, stable resume anchors, monotonic sequence handling, durable completion, correction fallback and offline retry. Local, CI, protected-preview and PostgreSQL 18 provider-free gates pass; live refresh/session/reconnect evidence remains externally blocked.

## Recently completed

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

- Linear cycle creation is subject to the workspace exposing cycle-management capability.
- Visual acceptance remains dependent on renewed structured access to the Curiofold Figma file.
- Final spent-credit behavior for refunds and chargebacks is gated by OD-010. CRFD-35 and the unspent-credit portion of CRFD-36 can proceed independently.
- Production infrastructure, live payment configuration and the initial production release remain explicit product-owner approval boundaries.

## Environment state

- Vercel Preview has development Clerk, Stripe test-mode and Neon nonproduction variables configured.
- The stable nonproduction integration branch is `development`; `main` remains the production/release branch.
- No production Neon project, live Stripe configuration or production release has been created.

## Known non-blocking risk

- The dependency audit reports GHSA-67mh-4wv8-2f99 at Moderate severity in a development-only `esbuild` copy nested under the latest available `drizzle-kit`. It is not shipped with the application or exposed as a development server. The High/Critical CI gate passes; update when Drizzle Kit removes the transitive loader rather than forcing an unverified override.

## Next

1. Open CRFD-36's pull request against `development`, run hosted gates, review the wallet constraint migration and merge only when green.
2. Keep CRFD-37's spent-credit behavior behind OD-010; do not invent negative-balance, suspension or entitlement-revocation policy.
3. Complete S1-10 visual acceptance when structured Figma access returns.
4. Retain live Clerk, Stripe and entitled-preview acceptance gates until their development integrations are available.
5. Do not provision production infrastructure or enable live payments without explicit product-owner approval.

## Open decisions

See `docs/project/OPEN_DECISIONS.md`. No open product decision blocks the foundation stage.

**Last updated:** 2026-09-24
