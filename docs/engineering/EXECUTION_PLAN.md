# Curiofold Engineering Execution Plan

**Status:** Approved
**Approved:** 2026-09-19
**Owner:** Codex (technical delivery), with the Product Owner retaining the decision boundaries in `docs/project/OPEN_DECISIONS.md`

This document is the canonical engineering and delivery plan for Curiofold v1. Product behaviour remains governed by `docs/product/PROJECT_SPEC.md`; visual and UX behaviour remains governed by `docs/design/PRODUCT_DESIGN.md` and approved Figma designs.

## 1. Mission and delivery outcome

Deliver a production-ready browser platform in which a user can discover a factual Story, authenticate, fund a credit wallet, unlock the Story exactly once, read it in an editorial browser-native Reader, resume reliably, complete it, find it in the Library and continue into another relevant Story.

Production-ready means the platform is secure, accessible, observable, recoverable, tested and operationally supportable. A working demo or a set of implemented screens is not sufficient.

## 2. Architecture

Curiofold is a TypeScript modular monolith:

- Next.js 16.3 App Router on Node.js 24 LTS;
- Vercel Node compute in Frankfurt;
- PostgreSQL 18 on Neon in Frankfurt;
- Drizzle schema/migrations and `node-postgres` transactions;
- Clerk authentication with database-owned authorization;
- Stripe-hosted Checkout behind a provider adapter;
- Git-reviewed, schema-validated Story documents;
- Vercel Blob for public covers and private Reader media;
- PostgreSQL full-text search for v1;
- Sentry EU, PostHog EU and provider-native telemetry.

No microservices, public database API, external search engine, Redis, dedicated queue, headless CMS or downloadable Story package are part of v1. New services require measured need and an ADR.

### Repository boundaries

```text
apps/web                 Next.js routes and delivery adapters
packages/domain          Framework-independent policies and use cases
packages/db              Schema, repositories, migrations and DB tests
packages/content         StoryDocument schema, compiler and renderer types
packages/ui              Semantic tokens and accessible UI primitives
packages/config          Typed environment contracts
content/stories          Reviewed Story sources and manifests
```

Rules:

- routes and UI call application services rather than business-sensitive SQL;
- domain code does not import Next.js or provider SDKs;
- only commerce services write wallet, grant, payment and entitlement tables;
- provider payloads are converted to validated domain commands;
- full paid content is never statically bundled or placed in a shared cache;
- the Node runtime is used for transactional paths.

## 3. Domain and data strategy

Use UUID keys, UTC `timestamptz`, integer credits and integer currency minor units. Text status columns have database `CHECK` constraints. Financial, publication, entitlement and audit histories are immutable.

Principal records:

- identity: users, preferences, consents, staff role assignments and audit events;
- content: Stories, locale records, immutable versions, sources, media, categories, Collections and related-Story relationships;
- reading: locale-specific progress, stable resume anchors, high-water progress and completion;
- commerce: wallet accounts, append-only entries, credit grants, spend allocations, payment orders/refunds, entitlements, provider events and unlock operations;
- operations: transactional outbox and reconciliation evidence.

One entitlement owns a Story across all locales. Progress is locale-specific; completion in any locale completes the Story.

### Money invariants

1. Cached wallet balance equals the sum of immutable ledger entries.
2. One fulfilled order creates one credit grant and one ledger credit.
3. One new unlock creates one debit and one entitlement atomically.
4. An existing entitlement is an idempotent success and never debits again.
5. Concurrent unlocks cannot overspend.
6. Browser redirects never grant credits.
7. Provider event, order, provider object and idempotency identifiers are uniquely constrained.
8. Refunds, disputes and corrections use compensating entries.

## 4. Identity and authorization

Clerk handles authentication, verified email, sessions and account security. PostgreSQL owns account state and editor, publisher, support, finance and admin role assignments.

All protected reads and mutations verify the server session. Staff operations require MFA, recent reauthentication, a reason and an audit event. Direct database edits are not a routine support mechanism.

Account deletion revokes sessions immediately and removes or anonymizes personal profile data after the approved retention period. Legally required financial and audit records are retained against a pseudonymous internal identifier.

## 5. Content, publication and Reader

`StoryDocument@v1` is structured JSON with stable Story, locale, revision and block IDs. Allowed blocks are paragraph, section heading, pull quote, fact box, image/diagram reference, source note and end matter. Raw HTML, executable MDX and automatic AI publication are prohibited.

Content PRs must include sources, review state, correction metadata, media rights/attribution and alt text. CI validates the document and publication workflow. Production publishing references an exact Git commit, inserts an immutable version and atomically updates the locale's published pointer. Rollback repoints to a previous version.

The Reader checks entitlement server-side. Public surfaces contain metadata and preview blocks only. Paid responses use private/no-store semantics. Progress combines a mutable resume anchor with a monotonic server-validated high-water mark; completion requires the final marker and at least 95% high-water progress.

## 6. Commerce and payment flow

Checkout accepts a configured pack identifier, never a client-provided amount. Curiofold creates a pending order before creating a Stripe Checkout Session. Stripe webhooks are raw-body verified, persisted uniquely and processed idempotently. The browser return page reads Curiofold's reconciled order state and never fulfils an order.

Scheduled reconciliation retries stored events and resolves stale orders. Refunds and chargebacks create explicit records and compensating wallet entries. Credit grants retain purchase provenance so unspent units can be reversed deterministically.

## 7. Discovery, localization and Library

Search uses PostgreSQL FTS, `pg_trgm` and `unaccent` over published localized metadata, never paid bodies. Related Stories use explicit editorial relationships first, then Collection/category similarity and deterministic fallback. No fabricated popularity or ML personalization is permitted.

Routes are locale-prefixed. PT-PT and PT-BR are distinct. Public content never silently falls back to another locale. UI messages use ICU catalogues. Library and Collection progress are derived from entitlements and progress rather than duplicated ownership state.

## 8. Security, accessibility and privacy

Security controls include deny-by-default authorization, strict input validation, parameterized SQL, CSRF/origin checks, restrictive CORS, CSP, security headers, least-privileged database roles, rate controls, secret scanning, dependency analysis and immutable privileged-operation audits.

Content protection is entitlement enforcement and proportionate deterrence. Curiofold will not claim universal screenshot prevention or harm zoom, selection, keyboard use or assistive technology.

WCAG 2.2 AA is a release criterion. Required coverage includes semantic structure, keyboard operation, visible focus, text expansion, reduced motion, contrast, approximately 44px targets, 200% zoom, VoiceOver/Safari and NVDA/Firefox.

Logs and analytics exclude emails, tokens, payment details, provider payloads, raw Story bodies and raw search queries. Session replay is off unless separately approved and fully masked.

## 9. Environments, delivery and recovery

| Environment | Contract                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------- |
| Local       | PostgreSQL 18 via Docker/Testcontainers, synthetic data and development provider accounts.  |
| CI          | Fresh isolated PostgreSQL per job; no shared remote database.                               |
| Preview     | Vercel preview plus ephemeral nonproduction Neon branch built from synthetic data.          |
| Staging     | Long-lived Vercel staging and nonproduction Neon staging branch.                            |
| Production  | Separate Vercel and Neon projects, production provider instances and protected credentials. |

Production requires a paid Neon plan, organization MFA, protected root branch, a warm minimum compute policy, at least seven days of PITR/history and independent encrypted backups. Application traffic uses the pooled URL; migrations and backups use the direct URL.

Migrations follow forward-only expand/migrate/contract. They are validated from empty and previous-release states, run as a separate gated job under an advisory lock and never execute on application cold start.

Recovery targets:

- deployment rollback under 30 minutes;
- PITR RPO under five minutes and RTO under one hour;
- independent-backup RPO under 24 hours and RTO under eight hours;
- restore rehearsal before launch and quarterly thereafter.

## 10. Quality gates

Every pull request runs formatting check, lint, strict type checking, unit tests, changed-domain database integration tests, content validation, migration validation, production build, core Chromium/axe smoke tests, secret scanning, dependency/SCA scanning and CodeQL.

Milestone closure adds full Chromium/Firefox/WebKit coverage, required viewports, payment retry/replay scenarios, concurrent wallet tests, authorization/security tests, manual accessibility validation, visual regression, performance/load evidence and migration/recovery rehearsal.

Production release additionally requires zero reconciliation discrepancies, no unresolved Critical/High security finding, no P0/P1 defect, WCAG evidence, good Core Web Vitals at p75, a successful restore/rollback rehearsal and verified operations/runbooks.

## 11. Delivery roadmap

### Initiative: Curiofold v1 — Production Launch

#### Project 1 — Safe Delivery Foundation

1. Approved plan becomes operational.
2. Production-shaped walking skeleton.
3. Environment and release controls.

#### Project 2 — Trusted Stories Ready to Publish

1. Canonical Story publication contract.
2. Editorial operations are safe.
3. Launch catalogue passes editorial gate.

#### Project 3 — Credits and Ownership Are Financially Correct

1. Auditable credits and atomic entitlements.
2. Payment top-ups reconcile.
3. Reversals and support operations are auditable.
4. Money-flow assurance gate.

#### Project 4 — The Curiosity-to-Completion Loop Works

1. Public curiosity experience.
2. Contextual auth, top-up and unlock preserve momentum.
3. Reader and resume are trustworthy.
4. Library and rabbit-hole continuation.
5. Product learning is truthful.

#### Project 5 — Curiofold Is Safe to Launch and Operate

1. Integrated staging release candidate.
2. Non-functional release gate.
3. Business and operations ready.
4. Controlled production launch.

### Critical path

```text
Approved plan and ADRs
  -> workspace, CI, configuration, migrations and preview
  -> identity boundary and Story contract
  -> secure Story Detail / Reader / progress slice
  -> editorial catalogue + financial core + product journey
  -> staging release candidate
  -> security/accessibility/performance/recovery gates
  -> business and operational readiness
  -> explicit production approval and controlled launch
```

## 12. First execution stage

The first stage is the Production-Shaped Walking Skeleton. Its issue identifiers and detailed acceptance criteria are held in Linear; the ordered outcomes are:

1. Materialize approved plan and controls.
2. Record foundational ADRs.
3. Establish workspace and modular boundaries.
4. Establish PR quality/security gates.
5. Define typed configuration and secret contracts.
6. Establish persistence, migrations and isolated DB tests.
7. Provision nonproduction delivery infrastructure.
8. Implement identity/session/authorization boundary.
9. Prove Story/locale/revision/source contract.
10. Establish semantic tokens and accessible shell.
11. Deliver public Story Detail slice.
12. Deliver entitlement-gated Reader slice.
13. Prove progress/resume/completion.
14. Add baseline observability/security evidence.
15. Certify the stage gate.

## 13. Delivery governance

- Reuse Linear's Backlog, Todo, In Progress, In Review, Done, Canceled and Duplicate statuses.
- Fibonacci estimates are 1, 2, 3, 5 and 8; an 8 requires decomposition review.
- One-week cycles are used once cycles are available in the workspace.
- Inactive blocked work leaves In Progress and carries an explicit blocker relation and owner.
- Done requires acceptance evidence, validation, review, merge, affected documentation and synchronized Linear state.
- Delivery dates are not forecast until at least three cycles provide throughput.

## 14. Launch gates and v1 Definition of Done

Launch requires closed brand, locale, pricing, legal, privacy, catalogue and media-rights decisions; complete canonical journeys; zero financial reconciliation discrepancies; security/accessibility/performance/recovery evidence; verified production configuration; operations runbooks; and explicit product-owner authorization.

Curiofold v1 is Done only when implementation, data integrity, security, accessibility, performance, reliability, observability, backups, tests, migrations, documentation, production smoke checks and Linear state all meet their approved criteria. No unresolved P0/P1 or unaccepted money/security/accessibility/core-journey defect may remain.

## 15. Material risks

The active risk register is maintained in Linear Project updates and summarized in `docs/engineering/STATUS.md`. Highest-consequence risks are wallet/payment races, refund policy after spend, paid-content leakage, staff compromise, preview PII, untested restore, incomplete editorial review, launch-language scope, unresolved legal requirements and delivery capacity.

## 16. Decision boundaries

Open product/business decisions live in `docs/project/OPEN_DECISIONS.md`. They do not block the foundation stage, but the affected Milestone may not close without resolution. Production vendor spend, live payment configuration and the initial production release require explicit product-owner approval.
