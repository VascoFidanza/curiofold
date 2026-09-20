# Curiofold Engineering Status

**Current phase:** Production-shaped walking skeleton
**Current milestone:** 1.2 — Production-shaped walking skeleton
**Health:** At Risk — the nonproduction application foundation is progressing, but the preview database integration requires product-owner authorization and development identity/payment providers are not configured.

## In review

- S1-09 — The structured Story, locale, revision and source contract is merged; final closure waits for the public/Reader vertical slice to consume it.
- S1-14 — The baseline observability, health/readiness and threat-model implementation has passed local validation and is awaiting CI/review.

## Recently completed

- S1-01 — Approved plan and execution controls merged in PR #1.
- S1-02 — Foundational ADR set merged in PR #1.
- S1-03 — Workspace and modular boundaries validated locally.
- S1-04 — PR quality and security gates merged in PR #3.
- S1-05 — Typed environment and client-bundle controls merged in PR #3.
- S1-06 — Persistence, migrations and isolated database-test foundations merged in PR #4.
- Neon nonproduction project provisioned in Frankfurt; resource inventory recorded in `ENVIRONMENTS.md`.
- Vercel nonproduction project linked to GitHub and its protected preview build smoke-tested successfully.
- Nonproduction environment inventory and CI hardening merged in PR #5.
- `StoryDocument@v1`, immutable revision projection and fail-closed publication lookup merged in PR #6.
- Linear roadmap materialized with five Projects, 18 Milestones and the first-stage issues.

## Blocked

- Linear cycle creation is subject to the workspace exposing cycle-management capability.
- Visual acceptance remains dependent on renewed structured access to the Curiofold Figma file.
- Development Clerk and Stripe credentials are not connected; no authenticated/payment flow is enabled.
- S1-07 is explicitly blocked pending authorization for the persistent, preview-only Neon–Vercel integration; no integration approval has been submitted.

## Known non-blocking risk

- The dependency audit reports GHSA-67mh-4wv8-2f99 at Moderate severity in a development-only `esbuild` copy nested under the latest available `drizzle-kit`. It is not shipped with the application or exposed as a development server. The High/Critical CI gate passes; update when Drizzle Kit removes the transitive loader rather than forcing an unverified override.

## Next

1. Complete the baseline request logging, health/readiness and threat-model evidence without external credentials.
2. Establish identity/session boundaries when development Clerk configuration is available.
3. Build the semantic application shell and public Story Detail slice from the approved written design foundation.
4. Resume preview database integration only after the product owner authorizes the persistent Vercel integration.

## Open decisions

See `docs/project/OPEN_DECISIONS.md`. No open product decision blocks the foundation stage.

**Last updated:** 2026-09-20
