# Curiofold Environment Inventory

This document records resource identity and safety boundaries without storing
connection strings, tokens, or other secret values.

## Current state

| Environment | Application                                                                                                                                 | Database                                                                                                                                  | Provider state                                                                                          | Data policy                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Local       | Run from `apps/web` with Node 24 and pnpm 11                                                                                                | Testcontainers PostgreSQL 18 when Docker is available                                                                                     | Synthetic Clerk/Stripe fixtures only                                                                    | No shared or production data                          |
| CI          | GitHub Actions quality and database jobs                                                                                                    | Fresh PostgreSQL 18 container per job                                                                                                     | Signed fixtures/mocks only                                                                              | Destroyed after each job                              |
| Preview     | Vercel `curiofold` project (`prj_qOjqibHnZATdR84vrDtAlEhOb8Qc`) linked to GitHub in `vascofidanzas-projects`; deployment protection enabled | Neon `curiofold-nonproduction` project, default `main` branch in `aws-eu-central-1`; 15 migrations applied and synthetic catalogue seeded | Development provider variables are configured in Vercel; authenticated route smoke test remains pending | Synthetic data only; no production branch ancestry    |
| Staging     | Not provisioned                                                                                                                             | Not provisioned                                                                                                                           | Not configured                                                                                          | Must be created separately from production            |
| Production  | Not provisioned                                                                                                                             | Not provisioned                                                                                                                           | Not configured                                                                                          | Requires product-owner authorization and launch gates |

## Neon nonproduction resource

- Organization: Fidanza (`org-young-frost-44414614`)
- Project: `curiofold-nonproduction` (`bitter-hat-89380353`)
- Region: AWS Europe Central 1 (Frankfurt), `aws-eu-central-1`
- PostgreSQL: 18
- Default branch: `main` (`br-purple-forest-b1cah3ow`)
- Initial database: `curiofold`
- Initial role: `curiofold`
- Plan limitation: the organization is currently on Neon Free; history retention is 21,600 seconds and the account does not permit changing the suspend interval.
- On 2026-09-26, all 15 repository migrations were applied through the direct connection. The guarded development seed created one synthetic Story, two immutable versions and one published English localization. A read-only database check confirmed 15 migration records, one Story and one published locale.
- The project contains synthetic data only; no personal or production data was introduced by this bootstrap.

The privileged connection string is intentionally not recorded here. It belongs
only in provider-scoped environment storage and local ignored files.

## Vercel nonproduction resource

- Team: `vascofidanzas-projects` (`team_Ri5uN8wH4DtXbvPs0XBXN18K`)
- Project: `curiofold` (`prj_qOjqibHnZATdR84vrDtAlEhOb8Qc`)
- Git repository: `VascoFidanza/curiofold`
- Framework: Next.js
- Root directory: `apps/web`
- Node.js: 24.x
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Verified preview: `https://curiofold-pc8q6ux7t-vascofidanzas-projects.vercel.app`
- Deployment protection is enabled; authenticated smoke testing returned the expected Curiofold shell.
- No production deployment was created or promoted.

## Required next actions

1. Run an authenticated Story Detail smoke test against the protected Preview.
   An unauthenticated request reaches Vercel's login page; the connected Vercel
   account currently returns 403 for deployment listing, so the route itself
   has not been independently verified after the database bootstrap.
2. Create preview branch lifecycle and cleanup automation after the Vercel
   project is linked.
3. Upgrade/secure the production Neon organization only at the production gate:
   MFA enabled, paid plan approved, separate project, protected branch, roles and
   backup policy verified.

The protected `POST /api/internal/payment-reconciliation` endpoint is implemented
but intentionally inactive until a scheduler is configured. When enabled, set a
Preview-only `CRON_SECRET` (32+ random characters) in Vercel and invoke it with
`Authorization: Bearer <CRON_SECRET>`. Never expose this value to the browser or
commit it.

## Secret-handling rules

- `.env.local`, Vercel environment values, and CI secrets are the only locations
  for credentials.
- `.env.example` contains placeholders only.
- Logs and status documents must contain names, IDs and states, never secret
  values or connection strings.
- A missing provider credential is a setup blocker, not a reason to weaken the
  server-only environment contract.
