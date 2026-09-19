# Curiofold Engineering Status

**Current phase:** Production-shaped walking skeleton
**Current milestone:** 1.2 — Production-shaped walking skeleton
**Health:** At Risk — the nonproduction Vercel project is linked, but preview environment variables and development provider credentials are not configured.

## In progress

- S1-07 — Provision the nonproduction delivery substrate.
- S1-09 — Prove the structured Story, locale, revision and source contract.

## Recently completed

- S1-01 — Approved plan and execution controls merged in PR #1.
- S1-02 — Foundational ADR set merged in PR #1.
- S1-03 — Workspace and modular boundaries validated locally.
- S1-04 — PR quality and security gates merged in PR #3.
- S1-05 — Typed environment and client-bundle controls merged in PR #3.
- S1-06 — Persistence, migrations and isolated database-test foundations merged in PR #4.
- Neon nonproduction project provisioned in Frankfurt; resource inventory recorded in `ENVIRONMENTS.md`.
- Vercel nonproduction project linked to GitHub and its protected preview build smoke-tested successfully.
- Linear roadmap materialized with five Projects, 18 Milestones and the first-stage issues.

## Blocked

- Linear cycle creation is subject to the workspace exposing cycle-management capability.
- Visual acceptance remains dependent on renewed structured access to the Curiofold Figma file.
- Development Clerk and Stripe credentials are not connected; no authenticated/payment flow is enabled.
- Preview environment variables are not configured in the Vercel project yet.

## Next

1. Merge the verified nonproduction environment inventory and CI hardening.
2. Complete the `StoryDocument@v1` contract, publication projection and isolated PostgreSQL evidence.
3. Configure preview-only environment keys in the linked Vercel project.
4. Connect development Clerk/Stripe projects without introducing production credentials.
5. Keep Neon and provider resources isolated from production until the environment contract is verified.

## Open decisions

See `docs/project/OPEN_DECISIONS.md`. No open product decision blocks the foundation stage.

**Last updated:** 2026-09-19
