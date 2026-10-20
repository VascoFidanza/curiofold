# Curiofold Engineering Status

**Current phase:** V1 convergence — complete journeys, real content and release readiness
**Current milestone:** V1 operational/release readiness — account lifecycle and recovery
**Health:** At Risk — core Sandbox journeys, payment failure/replay, account deletion, nonproduction restore/rollback and scheduled reconciliation with genuine alert delivery now have live evidence. Production backup/configuration, release assurance, real content and legal/fiscal approvals remain. Engineering-complete V1 is not yet certified; public launch is not authorized.

## Recent delivery evidence

- **2026-10-20 / CRFD-82:** local release acceptance found and corrected Reader
  skip-link/source focus targets and the missing reading-status landmark. Expanded
  keyboard/settings/source navigation coverage is in the existing three-browser
  suite. Bundled Node 24.19.0 is available for supported-runtime local checks.
  No remote CI/deployment is triggered while cost exposure remains unverified.
  This is not manual screen-reader or representative performance acceptance.
  Validation on Node 24.19.0: `pnpm validate` passed (349 unit tests; one database
  integration scenario deliberately skipped by the unit command), migration graph
  check passed, and browser suite passed 22 tests with two intentional non-Chromium
  touch skips. Production build and client-secret scan (31 bundles) passed.
  Local production HTTP smoke returned 404 for all three fixture routes even with
  the fixture flag set, retained security headers and suppressed X-Powered-By.
  With identity deliberately unconfigured, wallet returned 503/no-store and Reader
  rendered its unavailable state with private/no-store, without paid body text.
  This is a fail-closed smoke, not a new authenticated payment acceptance.
  Dependency audit at High threshold passed with an existing ESLint-only High
  exclusion (GHSA-vfj7-8cjw-p6xm) and a remaining moderate development-only esbuild
  advisory (GHSA-67mh-4wv8-2f99, Drizzle tooling). No claim of zero advisories.

- CRFD-80 — Privileged nonproduction recovery remediation replays authoritative
  restrictions into isolated local restores, coordinates Clerk bans/session
  revocation and fails closed on identity/provider errors. No financial mutation
  or production execution. See `RECOVERY.md` and linked Linear/PR validation.
  Real older-backup/Clerk acceptance is distinct from reconstructed integration tests.

- CRFD-79 — Actual nonproduction encrypted logical dump/local PostgreSQL restore
  passed, including tamper rejection, financial fingerprints, wallet reconciliation
  and privacy comparison. Local recovery server stopped. See `RECOVERY.md` for
  evidence and repeat command. Durable off-provider storage, independent key custody,
  scheduled backups remain separate launch gates. The later CRFD-80 live drill
  below closes the older-backup/Clerk acceptance case.

- CRFD-78 — Public Help and support entry point connects account, purchase-history,
  export/deletion and Library tools. `CURIOFOLD_SUPPORT_EMAIL` is an optional
  server-side Config value (not a secret); set a genuine monitored mailbox in
  each intended environment and redeploy. Missing/invalid values show explicit
  unavailability, never an invented address. Verify the rendered mailto and a real
  reply before launch. This is not approved legal copy, a refund policy or proof
  that support staffing exists. PR/Linear carry current validation and delivery.

- CRFD-77 — Read-only restore privacy acceptance compares current restrictions
  against recovered accounts and rejects revived access/history/privileges. This
  is an operator gate, not automatic remediation or evidence of an older-backup
  replay. Validation and delivery evidence live in Linear and the linked PR.

## Finite engineering-completion gates

**Decision (2026-10-18): Engineering V1 is NOT yet complete.** Genuine older-backup
and live Clerk remediation now pass (`RECOVERY.md`, CRFD-80); do not reopen that
accepted case without a defect. Remaining work is the finite list below, not an
AI-agent dependency or a reason to add post-V1 features.

Core Sandbox purchase/ownership/Reader, account export/deactivation, scheduled
reconciliation and actual alert delivery have recorded evidence above/below.
The following are not yet certified and prevent declaring engineering V1 complete:

1. Before accepting real customers/payments: durable independent backup destination/key custody, scheduled backup verification
   and alerts. Actual encrypted logical restore and older-backup/Clerk remediation
   have passed, but owner-only local temporary artifacts are not durable backups.
2. Final manual accessibility, security and representative performance acceptance.
3. Protected production publishing approval workflow, scoped production secrets/roles,
   deployment/migration/rollback controls and production monitoring configuration.
4. Essential support/legal disclosure surfaces and approved finance-operation behavior
   where refunds involve spent credits (CRFD-37 / OD-010).

Public launch additionally requires real human-reviewed English Stories (not fixtures),
accountant/legal approval of fiscal/refund/retention rules, genuine business/support
details, production provider setup and explicit Product Owner launch authorization.
No percentage or calendar forecast replaces these acceptance gates. Editorial working
standards are drafted in `CONTENT_PUBLICATION.md`; AI production remains post-V1.

### Exact external actions versus unfinished engineering

- **Budget decision (2026-10-18): new pre-launch services must cost €0.** This
  supersedes the earlier AWS S3 approval. No paid bucket/service may be provisioned.
  Existing authenticated encrypted backup/restore and Clerk recovery remediation
  remain validated; durable off-provider storage, separate key custody, scheduling
  and verification remain a before-real-customers/payments activation gate, not a
  reason to block independent engineering. Temporary local artifacts are not that service.
- Free-resource assessment: personal Google storage has 15 GB shared with Gmail
  and Photos; available owner quota has not been verified. A manual encrypted copy
  could reuse existing free capacity, but does not prove scheduled recoverability
  or independent key custody. GitHub Actions has included quotas, but overages can
  be billed with a payment method; alerts alone are not a hard stop. Neither is a
  certified zero-cost automated backup destination. No upload/service was created.
  Sources: [Google storage](https://support.google.com/drive/answer/6374270?hl=en),
  [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions),
  [hard-stop budgets](https://docs.github.com/en/billing/how-tos/set-up-budgets).
- CRFD-81: new live Stripe Checkout requires both production environment and the
  server-only Config `CURIOFOLD_LIVE_PAYMENTS_ENABLED=true`. Default is disabled;
  Sandbox Checkout, order retrieval and reconciliation remain independent. Do not
  enable the flag until the existing launch gates and owner authorization pass.
  Initial local validation: 12 provider tests, web typecheck, targeted ESLint and
  diff checks passed. The 2026-10-20 full local validation also runs on Node 24.
  Local validation/commit does not certify hosted acceptance or a
  development merge. Remote integration is pending verification that Actions and
  existing hosting cannot bill overages; GitHub billing requires owner sign-in.
- Billing checks remain separate: Vercel team access is confirmed, but the billing
  charges API returns `costs_not_found`; this is not proof of no billing exposure.
  GitHub requires account-wide Actions paid-usage blocking evidence. Vercel requires
  current plan/trial/add-on evidence: Spend Management's production-only pause can
  lag and does not stop storage charges, so it is not a guaranteed €0 cap for Preview.
  Owner screenshots must redact payment/address details. Do not upgrade or add a
  payment method. See [Vercel's documented limits](https://vercel.com/docs/spend-management).
  Owner clarification (2026-10-20): existing free functionality is authorized
  within available allowances; do not invent a blocker for each routine run or
  require a new budget as a prerequisite when existing zero-cost allowance is
  established. Current plan/remaining usage evidence is sufficient for bounded
  execution. Connector omits billing fields; existing CLI credentials return 403
  for the read-only team query. Remaining owner evidence is current GitHub Actions
  included usage and Vercel plan/usage, not new services, credentials or upgrades.
- Support: supply a genuine monitored mailbox, set server Config
  `CURIOFOLD_SUPPORT_EMAIL` in intended environments, redeploy and verify receipt/reply.
- Business/legal: resolve OD-007/010/011 with accountant/legal review, provide
  business/fiscal/complaints details and approved policy text. Finance-operation
  policy behavior and fiscal integration remain engineering work dependent on this.
- Production: approve required production resources/spend and supply production
  provider configuration through secret stores. Protected publishing/deployment
  controls and production verification are still required; no public release is authorized.
- Content/launch: approve genuine English launch Stories, reviewers/media rights,
  domain/brand and finally authorize public real-money launch explicitly.

Canonical Preview smoke on 2026-10-18 preserved the owner's 4 credits, two owned
Stories and one saved completion. Real keyboard skip navigation reached main content;
Reader settings had named controls. These narrow observations are not a full
screen-reader, security audit or representative performance sign-off.

## Current execution details

- CRFD-76 — Existing operations probe now detects exhausted or overdue deletion
  jobs without exposing identity data or changing retry/retention policy. Local
  typecheck, 26 unit tests, targeted lint and live read-only Neon query pass.
  PR #65 and Linear carry current hosted validation, merge and nonproduction
  deployment evidence; the operator runbook is in `PAYMENT_OPERATIONS.md`.

- CRFD-75 — Done; PR #64 merged as `dbaabcd` after hosted checks passed.
  UptimeRobot genuine DOWN email confirmed by Vasco at 15:48 Lisbon on
  2026-10-16 (incident 14:48:14 UTC). Real scheduled recovery passed at 14:51:01 UTC;
  independent health is HTTP 200, financial fingerprints/totals are unchanged,
  and the five-minute cadence is restored. Vasco confirmed the genuine UP email
  at 15:53 Lisbon, with incident resolution 14:53:18 UTC. Both delivery checks pass. Exact evidence
  is in `PAYMENT_OPERATIONS.md`.

- CRFD-73 — Actual Neon snapshot restore, financial fingerprint comparison, repository reads/reconciliation and protected Preview rollback/return passed on 2026-10-15. See `RECOVERY.md` for exact resources, restore-routing correction and limits. Independent encrypted backup/production recovery and older-snapshot deletion replay are not certified by this rehearsal.
- Linear access is restored; CRFD-72 and CRFD-73 are Done for their delivered scope. Their explicit production recovery limitations remain launch gates.
- CRFD-74 — Scheduled nonproduction payment operations are implemented and live-verified: authenticated 11:22/11:25 UTC batches re-read 10 existing Stripe Sandbox sessions and completed their jobs. Ledger/grant/entitlement counts and total credits remained unchanged. A nonfinancial alarm drill returned 503, then the next real schedule recovered health. Five-minute schedule enabled. See `PAYMENT_OPERATIONS.md` and Linear for delivery/quality-gate evidence.
- Final live payment acceptance passed on 2026-10-14. The Product Owner resent Sandbox event `evt_1UQBdxA6QiD7eFrPnQOmomAf` at 06:52:23 and confirmed Delivered / HTTP 200 / `{"received":true,"result":"duplicate"}`. Independent Neon comparison retained exactly one payment grant, one corresponding ledger entry, two active entitlements, wallet balance 4, fulfilled order and one processed event (attempt count 1, expected for the duplicate short-circuit). CRFD-50 and CRFD-56 are Done. Earlier pending replay/session notes below are superseded by this evidence.

Payment reconciliation and consistent read-only wallet auditing now run beside the nonproduction database. Durable heartbeat, exhausted/overdue/provider-failure diagnostics and a minimal health probe provide actionable failure signals. Nonproduction DOWN/UP email delivery to Vasco is verified; production alert routing and response coverage remain launch gates. Real launch content, legal/fiscal approval and production preparation remain separate gates. No speculative AI-agent work belongs in V1.

- V1 priorities now follow the convergence sequence in `EXECUTION_PLAN.md`: certify CRFD-50 → reviewed-content release workflow and launch catalogue → minimum account/privacy/support operations → staging security/accessibility/recovery gate → owner-approved production launch. AI editorial automation and nonessential polish are post-V1. Current fictional fixtures must not be presented as real launch content.

- CRFD-52 has merged owner-scoped payment history and auditable reversal review, but its final legal/provider behavior waits for OD-007. CRFD-37 remains held behind OD-010.

## In review

- S1-10 — The semantic token system and accessible responsive application shell pass local code, accessibility, build and four-width browser validation; final visual acceptance remains dependent on renewed Figma inspection.
- S1-13 — Progress/resume/completion and later-session acceptance passed; automated retry/reconnect tests pass. Historical pending-session notes below are superseded.

## Recently completed

- CRFD-72 — PR #61 merged as `319b749`; all seven hosted gates passed, including isolated PostgreSQL 18 concurrency/retry and financial-preservation scenarios. Live confirmed deletion immediately denied access; the actual Neon 08:52 UTC schedule completed cleanup, banned the disposable Clerk identity and revoked both sessions. Reading history was removed; five synthetic credits, one ledger entry and one entitlement remained intact. Receipt status survived reload. Canonical deployment `dpl_GAMCMP1Yp6U5PE2p3xCwnYdXZNK9` is READY; owner account, wallet and purchases passed browser smoke. Irreversible retention-sensitive erasure remains deliberately disabled.

- CRFD-50/56 — Decline, cancellation, later-session resume and actual Stripe Sandbox event resend now pass. See the 2026-10-14 replay evidence above. Historical entries below describe their state at the time, not current blockers.

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

- Direct reversal policy remains review-only until OD-007/010 defines legal/provider and spent-credit treatment. Live production commerce still waits for fiscal/legal approval and explicit launch authorization.
- External operational paging/channel and responding operator must be configured and verified before launch; health probes and redacted logs alone are not delivery evidence.
- Linear cycle creation is subject to the workspace exposing cycle-management capability.
- Visual acceptance remains dependent on renewed structured access to the Curiofold Figma file.
- Final spent-credit behavior for refunds and chargebacks is gated by OD-010. CRFD-35 and the unspent-credit portion of CRFD-36 can proceed independently.
- Production infrastructure, live payment configuration and the initial production release remain explicit product-owner approval boundaries.

## Environment state

- Vercel Preview has development Clerk, Stripe Sandbox and Neon nonproduction configured, with two synthetic Stories. Core journeys, webhook replay and deletion are live-verified. Original Neon `main` branch/compute routing is restored after the recovery rehearsal; the five-minute cleanup tick passed again at 09:05 UTC. Rehearsal snapshot/branch expire 2026-10-17. Credentials remain in provider secret management/ignored local files.
- The stable nonproduction integration branch is `development`; `main` remains the production/release branch.
- No production Neon project, live Stripe configuration or production release has been created.

## Known non-blocking risk

- GHSA-vfj7-8cjw-p6xm (High, unpatched `braces` stack exhaustion) is narrowly excluded from the dependency audit. Its only dependency path is the development-only Next.js ESLint plugin → fast-glob → micromatch. It processes repository-controlled glob patterns, not customer input, and is absent from the application runtime. Review this exception when an upstream patch/removal becomes available and before production release. Next.js, sharp and source-map-js advisories detected on 2026-10-12 were patched; no other High/Critical audit finding is excluded.
- The dependency audit reports GHSA-67mh-4wv8-2f99 at Moderate severity in a development-only `esbuild` copy nested under the latest available `drizzle-kit`. It is not shipped with the application or exposed as a development server. The High/Critical CI gate passes; update when Drizzle Kit removes the transitive loader rather than forcing an unverified override.

## Next

1. Retain CRFD-74 scheduled reconciliation evidence; do not repeat completed payments or deletion acceptance.
2. Connect the deployed operational probe to an approved external monitoring/paging channel and verify human delivery. No additional Stripe keys, products or webhook endpoints are required.
3. Finish the bounded release-assurance evidence: manual assistive-technology/accessibility, representative performance/security, actionable monitoring/support and recovery suppression for older backups. Add independent encrypted backup/restore verification; a provider snapshot alone does not satisfy that requirement.
4. Prepare a small genuinely reviewed English launch catalogue through the merged publication workflow. Fictional fixtures must not be purchasable in production. AI editorial automation is post-V1.
5. Obtain accountant/legal approval for invoicing/VAT/jurisdictions, digital-content consent/refunds, category-specific retention and unused-value/dispute handling. Preserve financial evidence and paid value meanwhile; finalize approved policy/support/business information without fabricated placeholders.
6. With explicit authorization, provision isolated production services/secrets, backup/alerting and protected release controls. Verify production configuration and obtain separate initial real-money launch approval.

## Open decisions

See `docs/project/OPEN_DECISIONS.md`. No open product decision blocks the foundation stage.

**Last updated:** 2026-10-15
