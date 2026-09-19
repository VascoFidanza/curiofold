# ADR-0013 — Browser content-protection boundary

**Status:** Accepted
**Date:** 2026-09-19

## Context

Paid content needs proportionate protection, but a browser cannot universally prevent an entitled user from inspecting or capturing delivered information.

## Decision

Enforce authentication and entitlement server-side, avoid public files/body APIs/shared caches, use private signed media and audit access. Do not disable zoom, selection, keyboard controls or render text to canvas. Do not promise screenshot prevention.

## Alternatives considered

- Downloadable PDF.
- Client-only route gating.
- Right-click/selection blocking and canvas rendering.

## Consequences

Curiofold deters casual leakage without harming accessibility or making false security claims. Determined capture remains an accepted browser boundary.
