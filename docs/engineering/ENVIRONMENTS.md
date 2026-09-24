# Curiofold Environment Inventory

This document records resource identity and safety boundaries without storing
connection strings, tokens, or other secret values.

## Current state

| Environment | Application                                                                                                                                                                                  | Database                                                                            | Provider state                                     | Data policy                                           |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| Local       | Run from `apps/web` with Node 24 and pnpm 11                                                                                                                                                 | Testcontainers PostgreSQL 18 when Docker is available                               | Synthetic Clerk/Stripe fixtures only               | No shared or production data                          |
| CI          | GitHub Actions quality and database jobs                                                                                                                                                     | Fresh PostgreSQL 18 container per job                                               | Signed fixtures/mocks only                         | Destroyed after each job                              |
| Preview     | Vercel `curiofold` project (`prj_qOjqibHnZATdR84vrDtAlEhOb8Qc`) linked to GitHub in `vascofidanzas-projects`; protected preview deployment verified; no environment variables configured yet | Neon `curiofold-nonproduction` project, default `main` branch in `aws-eu-central-1` | Clerk/Stripe development credentials not connected | Synthetic data only; no production branch ancestry    |
| Staging     | Not provisioned                                                                                                                                                                              | Not provisioned                                                                     | Not configured                                     | Must be created separately from production            |
| Production  | Not provisioned                                                                                                                                                                              | Not provisioned                                                                     | Not configured                                     | Requires product-owner authorization and launch gates |

## Neon nonproduction resource

- Organization: Fidanza (`org-young-frost-44414614`)
- Project: `curiofold-nonproduction` (`bitter-hat-89380353`)
- Region: AWS Europe Central 1 (Frankfurt), `aws-eu-central-1`
- PostgreSQL: 18
- Default branch: `main` (`br-purple-forest-b1cah3ow`)
- Initial database: `curiofold`
- Initial role: `curiofold`
- Plan limitation: the organization is currently on Neon Free; history retention is 21,600 seconds and the account does not permit changing the suspend interval.
- The project is empty and contains no personal or production data.

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

1. Configure preview-only `DATABASE_URL` and public environment keys in Vercel;
   never copy a production credential into preview.
2. Connect development Clerk and Stripe projects before enabling authenticated or
   payment flows.
3. Create preview branch lifecycle and cleanup automation after the Vercel
   project is linked.
4. Upgrade/secure the production Neon organization only at the production gate:
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
