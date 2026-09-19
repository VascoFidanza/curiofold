# ADR-0006 — Story localization and immutable version semantics

**Status:** Accepted
**Date:** 2026-09-19

## Context

A Story needs stable ownership while translations, corrections and publication status evolve independently.

## Decision

Give each Story a stable cross-locale identity. Each locale has its own slug, metadata, workflow and current immutable-version pointer. One entitlement covers all locales; progress is locale-specific; completion in any locale completes the Story.

## Alternatives considered

- Separate purchasable Story per translation.
- Mutable in-place content.
- Silent locale fallback.

## Consequences

Ownership stays simple and corrections remain auditable. Locales require independent editorial QA, and public surfaces must show an explicit unavailable state rather than fallback content.
