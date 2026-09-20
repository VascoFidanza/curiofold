# Curiofold Engineering Status

**Current phase:** Production-shaped walking skeleton
**Current milestone:** 1.2 — Production-shaped walking skeleton
**Health:** At Risk — the nonproduction application foundation is progressing, but the preview database integration requires product-owner authorization and development identity/payment providers are not configured.

## In review

- S1-09 — The structured Story, locale, revision and source contract is merged; final closure waits for the public/Reader vertical slice to consume it.
- S1-10 — The semantic token system and accessible responsive application shell pass local code, accessibility, build and four-width browser validation; final visual acceptance remains dependent on renewed Figma inspection.
- S1-11 — PR #9 merged the public Story Detail route, safe preview projection, missing-locale handling and SEO/share metadata. Local validation is complete and Vercel deploys the protected preview successfully, but the Story route cannot render there until S1-07 authorizes and supplies the preview database connection.
- S1-08 — PR #10 merged the provider-independent identity/session boundary, database-owned roles, allowlisted force redirects and signed/idempotent lifecycle projection. Local, CI and protected-preview provider-free validation pass; live Clerk session/revocation validation remains externally blocked.

## In review

- S1-12 — PR #11 delivers the provider-independent entitlement and Reader boundary: unique/auditable Story ownership, owner-only retrieval, private response policy, structured semantic rendering, accessible sources and simple reading controls. Local quality, migration, PostgreSQL 18 integration, build and browser gates pass; live entitled preview evidence remains externally blocked.

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
- S1-14 baseline observability, health/readiness, security headers and threat-model evidence completed in PR #7.
- Linear roadmap materialized with five Projects, 18 Milestones and the first-stage issues.

## Blocked

- Linear cycle creation is subject to the workspace exposing cycle-management capability.
- Visual acceptance remains dependent on renewed structured access to the Curiofold Figma file.
- Development Clerk and Stripe credentials are not connected; no authenticated/payment flow is enabled.
- S1-07 is explicitly blocked pending authorization for the persistent, preview-only Neon–Vercel integration; no integration approval has been submitted. The PR #9 preview reports healthy liveness, while its database-backed Story route fails closed with the expected missing-configuration error.

## Known non-blocking risk

- The dependency audit reports GHSA-67mh-4wv8-2f99 at Moderate severity in a development-only `esbuild` copy nested under the latest available `drizzle-kit`. It is not shipped with the application or exposed as a development server. The High/Critical CI gate passes; update when Drizzle Kit removes the transitive loader rather than forcing an unverified override.

## Next

1. Complete S1-10 visual acceptance when structured Figma access returns.
2. Retain S1-11 as blocked until its preview-data and final visual gates can run.
3. Complete PR #11 review, then retain S1-12's live entitlement/Reader preview gate as blocked until development identity and database connections are available.
4. Retain S1-08's live Clerk smoke gate as blocked until development credentials are connected.
5. Resume preview database integration only after the product owner authorizes the persistent Vercel integration.

## Open decisions

See `docs/project/OPEN_DECISIONS.md`. No open product decision blocks the foundation stage.

**Last updated:** 2026-09-20
