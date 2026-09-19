# ADR-0010 — PostgreSQL search and editorial relatedness

**Status:** Accepted
**Date:** 2026-09-19

## Context

The initial catalogue does not justify a separate search index or recommendation service.

## Decision

Use PostgreSQL full-text search, `pg_trgm` and `unaccent` over published localized metadata only. Related Stories use editorial relations, Collections and deterministic category/tag fallback.

## Alternatives considered

- Algolia or Typesense.
- Behavioural recommendation ML.
- Searching paid Story bodies.

## Consequences

Search remains transactionally aligned and operationally simple. External search requires measured relevance or p95 latency failure and a new ADR.
