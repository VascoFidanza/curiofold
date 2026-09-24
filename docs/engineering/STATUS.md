# Curiofold Engineering Status

**Current phase:** Production-shaped walking skeleton with parallel financial-integrity work
**Current milestone:** 1.2 — Production-shaped walking skeleton
**Health:** At Risk — provider-independent application and financial foundations are progressing, but the preview database integration requires product-owner authorization and development identity/payment providers are not configured.

## In progress

- CRFD-33 / Milestone 3.2D — Owner-scoped, customer-safe payment-order status and the canonical amount-based EUR top-up quote are implemented locally. Pricing snapshots now persist through migration 0009; durable stale-order/event reconciliation, retry/backoff observability and the full lifecycle gate remain.

## In review

- S1-09 — The structured Story, locale, revision and source contract is merged; final closure waits for the public/Reader vertical slice to consume it.
- S1-10 — The semantic token system and accessible responsive application shell pass local code, accessibility, build and four-width browser validation; final visual acceptance remains dependent on renewed Figma inspection.
- S1-11 — PR #9 merged the public Story Detail route, safe preview projection, missing-locale handling and SEO/share metadata. Local validation is complete and Vercel deploys the protected preview successfully, but the Story route cannot render there until S1-07 authorizes and supplies the preview database connection.
- S1-08 — PR #10 merged the provider-independent identity/session boundary, database-owned roles, allowlisted force redirects and signed/idempotent lifecycle projection. Local, CI and protected-preview provider-free validation pass; live Clerk session/revocation validation remains externally blocked.
- S1-12 — PR #11 merged the provider-independent entitlement and Reader boundary: unique/auditable Story ownership, owner-only retrieval, private response policy, structured semantic rendering, accessible sources and simple reading controls. Local, CI, PostgreSQL 18 and protected-preview provider-free gates pass; live entitled preview evidence remains externally blocked.
- S1-13 — PR #12 merged weighted progress, stable resume anchors, monotonic sequence handling, durable completion, correction fallback and offline retry. Local, CI, protected-preview and PostgreSQL 18 provider-free gates pass; live refresh/session/reconnect evidence remains externally blocked.

## Recently completed

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
- Development Clerk and Stripe credentials are not connected; no authenticated/payment flow is enabled.
- S1-07 is explicitly blocked pending authorization for the persistent, preview-only Neon–Vercel integration; no integration approval has been submitted. The PR #9 preview reports healthy liveness, while its database-backed Story route fails closed with the expected missing-configuration error.

## Known non-blocking risk

- The dependency audit reports GHSA-67mh-4wv8-2f99 at Moderate severity in a development-only `esbuild` copy nested under the latest available `drizzle-kit`. It is not shipped with the application or exposed as a development server. The High/Critical CI gate passes; update when Drizzle Kit removes the transitive loader rather than forcing an unverified override.

## Next

1. Complete S1-10 visual acceptance when structured Figma access returns.
2. Retain S1-11 as blocked until its preview-data and final visual gates can run.
3. Complete CRFD-32's signed, deduplicated provider-event inbox and exactly-once fulfilment; then implement CRFD-33 stale-order reconciliation and customer-safe order status.
4. Retain S1-13's live refresh/session/reconnect gate until development identity and database connections are available.
5. Retain S1-12's live entitlement/Reader preview gate as blocked until those development connections are available.
6. Retain S1-08's live Clerk smoke gate as blocked until development credentials are connected.
7. Resume preview database integration only after the product owner authorizes the persistent Vercel integration.

## Open decisions

See `docs/project/OPEN_DECISIONS.md`. No open product decision blocks the foundation stage.

**Last updated:** 2026-09-24
