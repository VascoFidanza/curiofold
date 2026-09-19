# ADR-0009 — Structured Reader and progress model

**Status:** Accepted
**Date:** 2026-09-19

## Context

Reader rendering must be accessible, deterministic and resilient to corrections. Scroll-pixel progress is unreliable across devices and content revisions.

## Decision

Render allowlisted semantic blocks. Track stable resume anchor plus within-block offset, monotonic weighted high-water progress, locale/version and sequence. Completion requires the end marker and at least 95% high-water progress.

## Alternatives considered

- PDF/embed Reader.
- Raw HTML/MDX.
- Current scroll percentage only.

## Consequences

Progress remains meaningful across layouts and most revisions. Stable block identifiers become an editorial contract and progress updates require server validation.
