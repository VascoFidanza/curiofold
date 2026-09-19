# Curiofold Environment Inventory

This document records resource identity and safety boundaries without storing
connection strings, tokens, or other secret values.

## Current state

| Environment | Application                                                          | Database                                                                            | Provider state                                     | Data policy                                           |
| ----------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| Local       | Run from `apps/web` with Node 24 and pnpm 11                         | Testcontainers PostgreSQL 18 when Docker is available                               | Synthetic Clerk/Stripe fixtures only               | No shared or production data                          |
| CI          | GitHub Actions quality and database jobs                             | Fresh PostgreSQL 18 container per job                                               | Signed fixtures/mocks only                         | Destroyed after each job                              |
| Preview     | Vercel project not yet linked; connector/CLI authentication required | Neon `curiofold-nonproduction` project, default `main` branch in `aws-eu-central-1` | Clerk/Stripe development credentials not connected | Synthetic data only; no production branch ancestry    |
| Staging     | Not provisioned                                                      | Not provisioned                                                                     | Not configured                                     | Must be created separately from production            |
| Production  | Not provisioned                                                      | Not provisioned                                                                     | Not configured                                     | Requires product-owner authorization and launch gates |

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

## Required next actions

1. Authenticate the Vercel CLI or dashboard and link a nonproduction project to
   this repository with the web root/build settings documented in the execution
   plan.
2. Configure preview-only `DATABASE_URL` and public environment keys in Vercel;
   never copy a production credential into preview.
3. Connect development Clerk and Stripe projects before enabling authenticated or
   payment flows.
4. Create preview branch lifecycle and cleanup automation after the Vercel
   project is linked.
5. Upgrade/secure the production Neon organization only at the production gate:
   MFA enabled, paid plan approved, separate project, protected branch, roles and
   backup policy verified.

## Secret-handling rules

- `.env.local`, Vercel environment values, and CI secrets are the only locations
  for credentials.
- `.env.example` contains placeholders only.
- Logs and status documents must contain names, IDs and states, never secret
  values or connection strings.
- A missing provider credential is a setup blocker, not a reason to weaken the
  server-only environment contract.
