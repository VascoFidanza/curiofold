# ADR-0004 — Clerk identity with database-owned authorization

**Status:** Accepted
**Date:** 2026-09-19

## Context

Consumer authentication should not make Curiofold operate passwords, email delivery or session security, while staff and financial roles require application-owned control.

## Decision

Use Clerk for authentication and PostgreSQL for account state, staff roles and authorization. Require verified email for sensitive consumer actions and MFA plus recent reauthentication for staff actions.

## Alternatives considered

- Neon Auth.
- Auth.js or Better Auth operated by Curiofold.
- Auth0.

## Consequences

Identity security is delegated while authorization remains portable and auditable. Curiofold must handle webhook/JIT profile synchronization and provider outage degradation.
