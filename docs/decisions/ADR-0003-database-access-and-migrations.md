# ADR-0003 — Database access and migration policy

**Status:** Accepted
**Date:** 2026-09-19

## Context

The application needs typed routine access and explicit control over financial transactions, locks and constraints.

## Decision

Use Drizzle for schema definitions, query typing and migrations; use `node-postgres` transactions or explicit SQL where critical behaviour must be visible. Use one migration authority and forward-only expand/migrate/contract changes. Never migrate on application startup.

## Alternatives considered

- Prisma.
- Raw SQL for all access.
- Multiple migration tools.

## Consequences

The codebase keeps type safety without obscuring sensitive SQL. Migrations require review, empty/upgrade validation and separate gated execution.
