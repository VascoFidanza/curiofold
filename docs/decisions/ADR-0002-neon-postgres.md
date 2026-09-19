# ADR-0002 — PostgreSQL 18 on Neon

**Status:** Accepted
**Date:** 2026-09-19

## Context

Credits, ledger entries, payment orders, entitlements, Story publication and progress require relational constraints, transactions and row locking.

## Decision

Use PostgreSQL 18 on Neon in Frankfurt. Maintain separate nonproduction and production projects. Runtime traffic uses pooled connections; migrations and backups use direct connections. Production requires a paid plan, organization MFA, protected root branch, PITR and independent logical backup.

## Alternatives considered

- AWS RDS/Aurora.
- Supabase Postgres platform.
- Firestore or distributed SQLite.

## Consequences

Curiofold gains branchable standard PostgreSQL with low initial operations cost. Neon-specific operational features are isolated so the application can move to another PostgreSQL provider.
