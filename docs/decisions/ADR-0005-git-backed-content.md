# ADR-0005 — Git-backed structured editorial publishing

**Status:** Accepted
**Date:** 2026-09-19

## Context

V1 requires reviewed factual content, immutable history, localization, sources and deterministic Reader rendering. The initial workflow is engineering/agent assisted and does not yet justify another content platform.

## Decision

Author schema-versioned `StoryDocument` JSON in Git. Require human PR approval and automated source/media/schema validation. Publish immutable database versions from an exact commit. A later CMS must emit the same contract.

## Alternatives considered

- Payload.
- Sanity or Contentful.
- A bespoke browser editor.

## Consequences

Review, diff, history and rollback use existing Git controls. Nontechnical editorial independence is deferred and is an explicit CMS-adoption trigger.
