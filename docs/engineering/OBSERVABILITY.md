# Curiofold Observability Baseline

## Purpose

This document defines the current operational evidence contract. It does not
claim that production monitoring is complete. External error tracking, product
analytics, synthetic monitoring and alert routing are later release work and
must preserve the safety rules below.

## Ownership

| Concern                                      | Accountable owner                      | Current mechanism                                                                 |
| -------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| Application failures and request correlation | Engineering                            | Redacted JSON runtime logs and request IDs                                        |
| Dependency readiness                         | Engineering                            | `/health/ready` with sanitized dependency states                                  |
| Process liveness                             | Engineering / hosting platform         | `/health/live`                                                                    |
| Privileged-operation evidence                | Domain owner and Engineering           | `audit_events` database record; typed writers are added with each privileged flow |
| Privacy review of telemetry                  | Product/privacy owner with Engineering | Allowlisted log schema and automated leak tests                                   |
| Incident response and alert coverage         | Engineering / named launch operator    | Required before the non-functional release gate                                   |

## Structured log contract

Server routes use one JSON object per line. The stable envelope contains:

- ISO-8601 `timestamp`;
- `level` and an allowlisted `event` name;
- `service`, environment and release identifiers when available;
- an opaque `requestId`;
- route template, HTTP method, response status and duration;
- opaque Story, order or audit-event identifiers only when required;
- a non-sensitive error class, never the raw error message.

The logger filters fields again at runtime. TypeScript types alone are not
treated as a privacy boundary.

The following must never be logged:

- email addresses or other direct personal identifiers;
- session, API, webhook or reset tokens;
- provider request/response payloads;
- card, bank, billing or detailed payment data;
- raw Story bodies or private media URLs;
- raw search text;
- environment-variable values or database connection strings;
- arbitrary exception messages that may contain any of the above.

New log fields require an explicit schema change and a leak test. Routes log
their stable template, not an unbounded URL or query string.

## Request correlation and error behavior

An inbound `X-Request-Id` is accepted only when it matches the bounded safe
identifier format. Otherwise Curiofold uses a valid Vercel request identifier
or generates a UUID. The identifier is returned as `X-Request-Id`.

Unexpected route failures produce RFC 9457-compatible
`application/problem+json` with a stable `internal_error` code and request ID.
The response and logs do not contain the exception message. This lets support
correlate a report without exposing a failure payload.

## Health endpoints

| Endpoint            | Meaning                                                                                      | Success                   | Failure behavior                                    |
| ------------------- | -------------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------- |
| `GET /health/live`  | The Node.js process can handle a request. It does not contact dependencies.                  | `200 {"status":"ok"}`     | Platform-level failure or timeout                   |
| `GET /health/ready` | Every currently registered critical dependency is usable. The baseline registers PostgreSQL. | `200`, all checks `ready` | `503`, failed checks reported only as `unavailable` |

Both responses use `Cache-Control: no-store`, run in the Node.js runtime and
carry a request ID. Adding Clerk, Stripe, private media or other critical
runtime dependencies requires an explicit readiness decision: a provider may
instead have a documented degraded mode if making it a hard readiness
dependency would unnecessarily take reading offline.

## Audit-event contract

The database includes append-oriented `audit_events` records with an actor,
action, target, correlation ID, reason and safe metadata. Every staff role
change, publication, refund, wallet correction, entitlement override and
emergency withdrawal will use a domain-specific writer rather than generic
CRUD. Those writers must:

1. require the authorization and reauthentication appropriate to the action;
2. record the same request correlation ID;
3. use a bounded reason code and exclude secrets or Story bodies;
4. commit with the business transaction where atomic evidence is required;
5. expose no update/delete operation to the application runtime.

The table foundation exists; the typed writers and database-role enforcement
are implemented with the corresponding identity, publication and commerce
flows so their authorization and transaction semantics can be tested together.

## Current operations procedure

For a failed request:

1. obtain the request ID from the response or user report;
2. search Vercel runtime logs for that exact opaque ID;
3. compare the route, release, status, duration and error class;
4. check `/health/ready` to distinguish dependency unavailability;
5. do not ask a user to send tokens, payment details or private Story content;
6. record a defect or incident when the issue is not an expected degraded mode.

For a readiness failure, investigate the named dependency through its own
provider telemetry. Never expand the public health response with provider
errors or credentials.

## Validation

Run:

```bash
pnpm --filter @curiofold/web test:unit
pnpm --filter @curiofold/web typecheck
pnpm --filter @curiofold/web build
pnpm security:bundle
```

Unit tests deliberately throw an exception containing a token and email-like
value, then verify neither appears in logs or the response.

## Follow-up gates

- CRFD-13 adds identity/session audit writers and verifies provider-outage
  behavior.
- CRFD-19 applies the request boundary to paid Reader access and content-leak
  tests.
- Commerce now exposes a read-only classified reconciliation result and a
  stable failure signal. The operations milestone schedules it, routes alerts
  and records run evidence; no automated repair is permitted.
- Publication milestones add their domain-specific audit writers and failure
  alerts.
- Sentry EU, alert routing, synthetic checks and launch dashboards are not
  enabled until their data-processing configuration and production ownership
  are approved.
- HSTS and a nonce-based full CSP are release work after the public domain and
  Clerk/browser integration are stable. The current global headers already
  prevent framing, object embedding, MIME sniffing and broad referrer leakage.
