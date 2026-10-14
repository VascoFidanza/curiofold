# Curiofold Engineering Status

**Current phase:** V1 convergence — complete journeys, real content and release readiness
**Current milestone:** 4.2 — Contextual auth, top-up and unlock preserve momentum
**Health:** At Risk — normal Sandbox purchase, ownership and Reader journeys are live-verified. Failure/replay acceptance, real launch content, legal/privacy and operational recovery gates remain. Milestone 3.3 separately waits for OD-010 on already-spent credits.

## In progress

- Final live payment acceptance passed on 2026-10-14. The Product Owner resent Sandbox event `evt_1UQBdxA6QiD7eFrPnQOmomAf` at 06:52:23 and confirmed Delivered / HTTP 200 / `{"received":true,"result":"duplicate"}`. Independent Neon comparison retained exactly one payment grant, one corresponding ledger entry, two active entitlements, wallet balance 4, fulfilled order and one processed event (attempt count 1, expected for the duplicate short-circuit). CRFD-50 and CRFD-56 are Done. Earlier pending replay/session notes below are superseded by this evidence.

The next release work is minimum account lifecycle/privacy operations and recovery validation. Real launch catalogue/reviewer/language/media and legal decisions remain Product Owner gates; the reviewed publication mechanism is already merged. Production publishing and initial launch remain approval-gated.

- V1 priorities now follow the convergence sequence in `EXECUTION_PLAN.md`: certify CRFD-50 → reviewed-content release workflow and launch catalogue → minimum account/privacy/support operations → staging security/accessibility/recovery gate → owner-approved production launch. AI editorial automation and nonessential polish are post-V1. Current fictional fixtures must not be presented as real launch content.

- CRFD-52 has merged owner-scoped payment history and auditable reversal review, but its final legal/provider behavior waits for OD-007. CRFD-37 remains held behind OD-010.

## In review

- CRFD-50 — Normal live journeys accepted on 2026-10-13: verified account, catalogue/public preview, zero-credit recovery, €4 rejection, €5 Sandbox payment → 5 confirmed credits, preserved Story return, one-credit unlock → 4 credits, direct Story purchase → exactly 130 EUR cents and no credits minted, both Stories in Library. Neon confirms both orders fulfilled, one payment grant/debit, two active entitlements and wallet/ledger balance 4. Reader progress and completion persist across refresh; related actions and Library 1/2 completed work. Account export matches these records. Controlled Clerk sign-out leaves Account unauthenticated after reload and redirects direct Reader access to sign-in with preserved return context; anonymous public detail works and PT-PT draft remains unavailable. Remaining: live decline/cancel/provider replay and subsequent new-session resume evidence. Test account was left signed out; sign in again before continuing authenticated tests. Browser blocked direct JSON wallet navigation, so no live API-denial claim is made; automated authorization tests pass.
- S1-10 — The semantic token system and accessible responsive application shell pass local code, accessibility, build and four-width browser validation; final visual acceptance remains dependent on renewed Figma inspection.
- S1-13 — Weighted progress, resume, completion, sequence, correction fallback and retries are merged and pass automated gates; live refresh/completion now pass. New-session/reconnect acceptance remains with CRFD-50.

## Recently completed

- CRFD-50 acceptance follow-up — PR #60 (`f0f4571`) fixes canceled credit Checkout returns stuck on confirmation. All hosted gates passed and the deployed canonical Preview now shows cancellation and retry immediately. Stripe Sandbox decline card produced the expected decline; wallet remained 4 with no new grant. The subsequent signed-in session restored completed Lantern Atlas in Library and Reader; CRFD-16 is Done. Real fulfilled top-up/direct orders each have one processed provider event with one attempt. Automated PostgreSQL concurrent replay tests pass; an actual Stripe resend against Preview remains unverified and must not be inferred from record inspection. Test account remains signed in.

- CRFD-70 — PR #59 merged the guarded nonproduction reviewed-content operator path (`054fac5`). Exact committed manifest/source, serialized expected-state changes, immutable versions, correction/rollback/archive and audit evidence are implemented. All hosted quality/security, PostgreSQL 18 CLI/release rehearsals, cross-browser and CodeQL checks passed. The clean-runner test caught and fixed undeclared CLI dependencies. See `CONTENT_PUBLICATION.md`; production execution is blocked until separately approved controls exist. No production resources or real launch content were introduced.
- CRFD-11/13/15/19 — Story contract, identity/session boundary, public detail and entitlement-gated Reader thin slices marked Done after their existing automated/merge evidence was completed by live Preview acceptance. Broader release gates remain separate.

- CRFD-71 — PR #58 merged the short-Story completion fix (`3f24e8d`) after all hosted checks passed. The canonical Preview deployment was verified through GitHub's successful Vercel status and browser acceptance: Lantern Atlas reaches 100%, saves durable completion, offers related Stories and remains completed after reload.

- CRFD-69 — PR #57 merged secure Account JSON export into `development` (`c3c7f31`). Verified active users can download explicit safe profile, wallet, ownership, progress, order and reversal data from one repeatable-read snapshot. Automated and hosted checks passed. Live download on 2026-10-13 matched two orders, two owned Stories, one completion and 4 credits. No migration/provider configuration was needed. Account deletion/retention and provider-held data access are not completed by this feature.

- CRFD-68 — The Library has URL-based All, Unread, In progress and Completed filters with authoritative counts and accessible selection. Filtered-empty shelves offer a route back to all owned Stories; the full Library progress summary remains independent of the selected filter.
- CRFD-67 — Reader progress automatically retries temporary network, rate-limit and server failures up to three times with exponential backoff. Retries use the latest queued position, stop on authorization/validation rejection, and are canceled on success or unmount. Exhausted failures retain the account-scoped queue for later reconnect.
- CRFD-66 — Reader offline retry queues are scoped to the authenticated internal account, Story and locale. Switching accounts cannot replay another reader's stored progress; legacy unscoped queues are ignored because their owner cannot be verified. Persisted server progress is unaffected.
- CRFD-65 — Reader retry storage preserves the newer queued position when an older in-flight save fails. The overlapping failure/reconnect regression test verifies that a stale request never overwrites a newer sequence. Required CI also exposed GHSA-vcvr-r3jv-pc5j; Next.js and its lint configuration were patched to 16.3.6 to restore the security gate.
- CRFD-64 / Milestone 4.4 — Collection cards and detail now derive owned/completed counts and Reader actions from the authoritative Library, while anonymous visitors retain public previews. Library failures do not invent zero progress. Completion is projected across Story locales without creating a second entitlement or progress table. Authenticated Preview acceptance remains part of CRFD-50.
- CRFD-63 / Milestone 4.4 — The previously broken Collections navigation now leads to a public index and locale-specific Collection detail. The initial explicitly synthetic Collection contains only currently published Story revisions; editorial ordering and known-key validation keep future membership reviewable. No paid Story body, new database table, or production content was introduced. The launch catalogue remains later work.
- CRFD-62 / Milestone 1.2 — PR #49 merged a second explicitly fictional Story and an allowlisted, idempotent nonproduction seed. Hosted quality/security, PostgreSQL 18, browser and CodeQL gates passed. The named Neon project now has two published English Stories; the seed rerun made zero changes. The development Preview serves `/en/stories/lantern-atlas` (200) and redirects anonymous Reader access (307), giving CRFD-50 a distinct Story for the one-credit unlock test.
- CRFD-61 / Milestone 4.4 — PR #48 merged an entitlement-backed Library progress summary and repaired the mobile Progress destination. Local and hosted quality, PostgreSQL 18, browser and CodeQL checks passed. No new ownership state or database schema was introduced.
- CRFD-59 / Milestone 4.4 — PR #45 merged editorial-first, same-category-fallback Story suggestions after durable Reader completion into `development`. Unpublished, wrong-locale, duplicate and current Stories are excluded; Library/Discover actions remain. Local checks and hosted PostgreSQL 18, responsive browser, security and CodeQL gates passed. Live authenticated Preview acceptance remains outstanding.
- CRFD-57 / Milestone 4.1 — PR #44 merged published-only, locale-scoped category browsing and Discover/Story Detail category links into `development`. Local and hosted PostgreSQL 18, responsive browser, security, and CodeQL checks passed. New launch categories still require reviewed localized labels rather than the readable fallback.
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

- Remaining live money-flow acceptance covers decline/cancel/provider replay and failure cases, not the already-verified normal one-credit/direct/top-up paths. Direct reversal evidence remains review-only until OD-007 defines legal/provider and entitlement policy. Live production commerce still waits for OD-007.
- Linear cycle creation is subject to the workspace exposing cycle-management capability.
- Visual acceptance remains dependent on renewed structured access to the Curiofold Figma file.
- Final spent-credit behavior for refunds and chargebacks is gated by OD-010. CRFD-35 and the unspent-credit portion of CRFD-36 can proceed independently.
- Production infrastructure, live payment configuration and the initial production release remain explicit product-owner approval boundaries.

## Environment state

- Vercel Preview has development Clerk, Stripe Sandbox and Neon nonproduction configured, with 18 migrations and two synthetic Stories. Signed-in purchase/unlock/Reader/progress and controlled signed-out boundaries were live-verified on 2026-10-13; remaining acceptance is listed above.
- The stable nonproduction integration branch is `development`; `main` remains the production/release branch.
- No production Neon project, live Stripe configuration or production release has been created.

## Known non-blocking risk

- GHSA-vfj7-8cjw-p6xm (High, unpatched `braces` stack exhaustion) is narrowly excluded from the dependency audit. Its only dependency path is the development-only Next.js ESLint plugin → fast-glob → micromatch. It processes repository-controlled glob patterns, not customer input, and is absent from the application runtime. Review this exception when an upstream patch/removal becomes available and before production release. Next.js, sharp and source-map-js advisories detected on 2026-10-12 were patched; no other High/Critical audit finding is excluded.
- The dependency audit reports GHSA-67mh-4wv8-2f99 at Moderate severity in a development-only `esbuild` copy nested under the latest available `drizzle-kit`. It is not shipped with the application or exposed as a development server. The High/Critical CI gate passes; update when Drizzle Kit removes the transitive loader rather than forcing an unverified override.

## Next

1. Sign back into the canonical Preview test account for the remaining CRFD-50 decline/cancel/replay and new-session/reconnect cases. Do not repeat successful purchases/unlocks unnecessarily; both existing synthetic Stories are already owned by this account.
2. Keep the successful direct €1.30 and credit top-up test-mode evidence linked to the same reconciled nonproduction order/entitlement/ledger state; do not infer live-payment readiness from it.
3. Close Milestone 4.2 and the walking-skeleton gate only after live development-provider, authorization and progress acceptance, not merely green provider-free tests.
4. Obtain the OD-010 product/legal decision before starting CRFD-37; options remain negative balance, spending suspension, entitlement revocation or manual review.
5. Complete S1-10 visual acceptance when structured Figma access returns.
6. Prepare real reviewed content using the committed manifest/operator path; obtain launch catalogue/reviewer/language/media decisions. Production publication remains disabled until protected approval controls are explicitly authorized and verified.
7. Do not provision production infrastructure or enable live payments without explicit product-owner approval.

## Open decisions

See `docs/project/OPEN_DECISIONS.md`. No open product decision blocks the foundation stage.

**Last updated:** 2026-10-13
