# ADR-0012 — Security, privacy, telemetry and audit baseline

**Status:** Accepted
**Date:** 2026-09-19

## Context

Curiofold handles identity, paid access and financial state. Operational evidence must not itself leak personal, payment or Story content.

## Decision

Use deny-by-default policies, strict validation/security headers, least-privileged roles, Sentry EU, PostHog EU, structured redacted logs and immutable privileged-operation audits. Raw Story bodies, email, tokens, payment data and raw search text are excluded from telemetry.

## Alternatives considered

- Provider defaults without a shared policy.
- Full session replay.
- Self-hosted observability stack.

## Consequences

Events and logs require explicit schemas and redaction tests. Product analytics remains consent-aware and non-blocking.
