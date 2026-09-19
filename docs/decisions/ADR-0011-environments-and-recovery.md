# ADR-0011 — Environment, deployment and recovery topology

**Status:** Accepted
**Date:** 2026-09-19

## Context

Preview convenience must not expose production data, and deployment rollback must not depend on destructive database rollback.

## Decision

Use local, isolated CI, synthetic preview, long-lived staging and isolated production environments. Preview branches derive only from nonproduction templates. Deployments use protected promotion and forward-compatible migrations. Combine Neon PITR with independent encrypted logical backups and regular restore drills.

## Alternatives considered

- One shared database for all environments.
- Production data clones for previews.
- Down-migration-based rollback.

## Consequences

The topology costs more than a single environment but materially reduces privacy and release risk. Production infrastructure requires explicit spend approval.
