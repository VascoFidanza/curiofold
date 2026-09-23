# Curiofold Initial Threat Model

**Status:** Active foundation baseline

**Last reviewed:** 2026-09-23

**Next mandatory review:** Before Milestone 1.2 closes and whenever a trust
boundary, payment provider or content-delivery model changes.

## Scope and security objectives

This initial model covers the planned browser, Next.js application, identity,
PostgreSQL, payment, media and telemetry boundaries. It is intentionally
updated alongside implementation. A listed future control is not evidence that
the risk is already mitigated.

The primary objectives are:

1. only entitled users receive full paid Story content;
2. authentication cannot be confused with authorization;
3. credits, orders and entitlements remain correct under retries and races;
4. only reviewed content reaches publication;
5. privileged actions are attributable and tamper-evident;
6. personal, payment and paid-content data do not leak through telemetry,
   previews, caches or provider integrations;
7. outages degrade narrowly instead of corrupting state.

## Assets

| Asset                               | Required protection                                 |
| ----------------------------------- | --------------------------------------------------- |
| Session and identity state          | Confidentiality, integrity, revocation              |
| Paid Story text and private media   | Entitlement-gated confidentiality                   |
| Credits, grants, orders and refunds | Strong integrity, auditability and reconciliation   |
| Story publication state and sources | Integrity, provenance and recoverability            |
| Entitlements and reading progress   | Integrity and user-scoped confidentiality           |
| Personal and consent data           | Minimization, confidentiality and lifecycle control |
| Secrets and provider credentials    | Confidentiality, least privilege and rotation       |
| Audit and operational evidence      | Integrity, bounded retention and privacy            |

## Trust boundaries

1. **Untrusted browser → Vercel application:** every identifier, header, body,
   cookie and redirect target is attacker-controlled until validated.
2. **Vercel application → Clerk:** identity assertions are accepted only after
   provider-supported session or webhook verification.
3. **Vercel application → PostgreSQL:** only server code connects; application,
   migration and backup roles are separated before production.
4. **Stripe → webhook endpoint:** the raw body and signature are verified before
   an idempotent provider event enters the domain.
5. **Git/content pipeline → published catalogue:** schema validation does not
   replace accountable human review and protected publication authority.
6. **Application → private media:** signed access is short-lived and scoped;
   public media and paid media use separate storage policy.
7. **Application → telemetry providers:** only allowlisted, minimized events may
   leave the runtime.
8. **Preview/staging → production:** credentials and personal data never cross
   this boundary through database branching or copied configuration.

## Threat register and control ownership

| ID    | Threat and consequence                                                           | Current control/evidence                                                                                                                                                      | Remaining action / owner                                                                                                             | Status                  |
| ----- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| TM-01 | Session theft, login-CSRF or unsafe return paths enable account access           | Resource-adjacent session checks, database account state, allowlisted return paths and explicit origin configuration are implemented                                          | Complete live Clerk expiry, logout, revocation and provider-origin tests / Engineering                                               | Baseline active         |
| TM-02 | IDOR or client-only gating exposes paid Story content or another user's progress | Server-side entitlement guards Reader retrieval and progress mutation; unknown/unowned IDs share a response; wrong-user/revocation and concurrency tests run on PostgreSQL 18 | Complete live anonymous, wrong-user, direct-request and session-revocation evidence / Engineering                                    | Baseline active         |
| TM-03 | CDN, search, preview or logs leak paid content                                   | Public metadata is separated from full blocks; Reader/progress responses are private/no-store; runtime logs and progress telemetry exclude Story bodies                       | Complete live cache checks and retain paid bodies outside search/telemetry / Engineering                                             | Baseline active         |
| TM-04 | Executable or malformed Story content causes XSS or renderer compromise          | `StoryDocument@v1` rejects arbitrary HTML/JavaScript, unsafe URL schemes and invalid blocks; the Reader projects only allowlisted semantic components                         | Introduce a nonce-based full CSP and complete live renderer/security verification / Engineering                                      | Baseline active         |
| TM-05 | Unauthorized or compromised staff action publishes, refunds or changes access    | Database-owned role history and deny-by-default MFA/recent-reauthentication policy are implemented                                                                            | Add domain-specific privileged commands, audit writers and live MFA evidence in identity/editorial/commerce milestones / Engineering | Baseline active         |
| TM-06 | Concurrent unlocks, retries or direct mutation overspend credits                 | Credit grants now use row locks, globally unique operation keys, append-only ledger triggers, immutable lot provenance and PostgreSQL 18 concurrency tests                    | CRFD-23 adds atomic debit/FIFO allocation/entitlement; CRFD-22 adds continuous reconciliation / Engineering                          | Partially active        |
| TM-07 | Forged, replayed or reordered payment events duplicate credits                   | Raw-body signature, unique event inbox and asynchronous reconciliation are accepted                                                                                           | Milestone 3.2 implements Stripe test-mode replay/out-of-order evidence / Engineering                                                 | Planned—launch critical |
| TM-08 | Secrets reach Git, client bundles, logs or preview output                        | Secret scan, bundle scan, typed env separation and allowlisted logger are active                                                                                              | Add provider-scoped credentials only through protected stores; rehearse rotation / Engineering                                       | Baseline active         |
| TM-09 | Preview data or credentials are derived from production                          | Environment contract requires synthetic preview branches and separate production projects                                                                                     | CRFD-14 completes preview lifecycle after account authorization / Engineering + Product Owner authorization boundary                 | Partially blocked       |
| TM-10 | Telemetry captures identity, search terms, payments or Story bodies              | ADR-0012, runtime log filter and leak/failure tests are active; replay is not enabled                                                                                         | Review Sentry/PostHog EU schemas and retention before activation / Engineering + privacy owner                                       | Baseline active         |
| TM-11 | Account deletion destroys financial evidence or retains avoidable personal data  | Pseudonymous retention model is accepted                                                                                                                                      | Account lifecycle milestone implements export, disable, anonymization and legal-retention tests / Product/legal + Engineering        | Planned                 |
| TM-12 | Provider outage cascades into unrelated product failure                          | Architecture defines narrow degradation; liveness and database readiness are distinct                                                                                         | Each adapter must document timeout, retry and degraded mode; synthetics verify owned reading / Engineering                           | Baseline active         |
| TM-13 | Browser protections harm accessibility without stopping determined copying       | ADR-0013 rejects canvas text, disabled zoom/selection and screenshot guarantees                                                                                               | Reader accessibility tests enforce the boundary / Engineering + Product                                                              | Accepted boundary       |
| TM-14 | Operational errors cannot be correlated, delaying containment                    | Stable request IDs, structured start/completion/failure logs and sanitized readiness are implemented                                                                          | Add Sentry EU, alerts and named incident ownership before release / Engineering                                                      | Baseline active         |

## Abuse cases required in later test matrices

- guess or substitute another user's Story, progress, order or entitlement ID;
- replay the same unlock, Checkout creation or provider event concurrently;
- send a return URL to an external origin;
- publish an unreviewed locale or a Story containing executable markup;
- request a draft, archived or withdrawn Story through a direct URL;
- force full paid content into a public cache, search projection or error log;
- use a stale staff session after role revocation;
- exhaust checkout, unlock, search, progress or webhook endpoints;
- submit an out-of-order progress sequence or payment event;
- create a preview from production data or expose production credentials to a
  pull request.

## Accepted boundaries

- An entitled browser can inspect or capture content already delivered to it.
  Curiofold deters casual redistribution but does not claim universal DRM.
- Single-region operation has a bounded outage risk for v1. Independent backup
  and restoration targets remain launch requirements.
- Provider availability cannot be guaranteed. Degraded behavior must preserve
  correct internal state and already-owned reading where safe.

Residual risks are accepted only at a stage gate with an owner, rationale and
review date. Critical or High security findings cannot enter production
unresolved.
