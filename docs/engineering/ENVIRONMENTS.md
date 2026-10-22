# Curiofold Environment Inventory

This document records resource identity and safety boundaries without storing
connection strings, tokens, or other secret values.

## Current state

| Environment | Application                                                                                                                                 | Database                                                                                                                                       | Provider state                                                                               | Data policy                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Local       | Run from `apps/web` with Node 24 and pnpm 11                                                                                                | Testcontainers PostgreSQL 18 when Docker is available                                                                                          | Synthetic Clerk/Stripe fixtures only                                                         | No shared or production data                               |
| CI          | GitHub Actions quality and database jobs                                                                                                    | Fresh PostgreSQL 18 container per job                                                                                                          | Signed fixtures/mocks only                                                                   | Destroyed after each job                                   |
| Preview     | Vercel `curiofold` project (`prj_qOjqibHnZATdR84vrDtAlEhOb8Qc`) linked to GitHub in `vascofidanzas-projects`; deployment protection enabled | Neon `curiofold-nonproduction` project, default `main` branch in `aws-eu-central-1`; tracked migrations applied and synthetic catalogue seeded | Development Clerk and Stripe Sandbox; authenticated core journeys and deletion live-verified | Test accounts/Sandbox transactions; no production ancestry |
| Staging     | Not provisioned                                                                                                                             | Not provisioned                                                                                                                                | Not configured                                                                               | Must be created separately from production                 |
| Production  | Not provisioned                                                                                                                             | Not provisioned                                                                                                                                | Not configured                                                                               | Requires product-owner authorization and launch gates      |

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
- On 2026-09-28, after PR #49 passed all hosted gates and merged into `development`, the guarded seed added `lantern-atlas` to the same nonproduction project using an ephemeral project-scoped connection; no credential file was created. An immediate rerun reported zero changes. Read-only verification found two published English Stories: Clockwork Gardens retained its two immutable versions and The Lantern Atlas has one. The canonical protected Preview returned HTTP 200 for the new public Story and redirected an anonymous Reader request with HTTP 307.
- The project contains synthetic data only; no personal or production data was introduced by this bootstrap.

The privileged connection string is intentionally not recorded here. It belongs
only in provider-scoped environment storage and local ignored files.

## Vercel nonproduction resource

- Plan: Hobby, independently confirmed by the Product Owner on 2026-10-20.
  Vercel usage and GitHub Actions included-usage evidence were verified on
  2026-10-21; routine bounded CI/Preview work is authorized within those allowances. No paid
  upgrade, new service or payment method is authorized.
- Team: `vascofidanzas-projects` (`team_Ri5uN8wH4DtXbvPs0XBXN18K`)
- Project: `curiofold` (`prj_qOjqibHnZATdR84vrDtAlEhOb8Qc`)
- Git repository: `VascoFidanza/curiofold`
- Framework: Next.js
- Root directory: `apps/web`
- Function placement: `apps/web/vercel.json` selects a single `fra1` region beside
  the existing Frankfurt Neon database. This uses the existing Hobby single-region
  capability, with no failover/multi-region feature, new resource or plan upgrade.
  Before this correction, real `/health/ready` responses showed `cdg1::iad1`
  (European ingress, US Node execution). Three baseline readiness TTFBs were
  2.976 / 0.473 / 0.634 seconds; the first may include cold dependencies. Feature
  deployment `dpl_FMGauzjrwR4CJwMh7vwEjjAiGvQA` (3e9d6fe) verified region `fra1`:
  three readiness requests returned 200 with `cdg1::fra1` and TTFBs
  0.975 / 0.584 / 0.290 seconds. These small, non-equivalent warm/cold samples are
  diagnostics, not p75 customer-performance or causal speedup acceptance. Canonical
  post-merge verification is recorded in CRFD-86. Vendor-wide data residency is not
  established merely by pinning application compute.
- Node.js: 24.x
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Canonical testing Preview: `https://curiofold-git-development-vascofidanzas-projects.vercel.app`
- Deployment protection is enabled; authenticated smoke testing returned the expected Curiofold shell.
- No production deployment was created or promoted.

## Required next actions

1. Authenticated discovery, purchases, wallet, Library, Reader/progress and
   account export passed live Preview acceptance on 2026-10-13/14. CRFD-72
   deletion/session/cleanup acceptance passed on 2026-10-15; PR #61 is merged.
2. Neon `accountcleanup` is enabled every five minutes on the existing
   nonproduction branch. Credentials are stored in Function environment
   management. See `ACCOUNT_DELETION.md` and `RECOVERY.md` for actual execution,
   restoration and rollback evidence. Preview branch lifecycle remains separate.
3. Upgrade/secure the production Neon organization only at the production gate:
   MFA enabled, paid plan approved, separate project, protected branch, roles and
   backup policy verified.

Payment scheduling now uses the Neon `paymentoperations` Function and its
authenticated five-minute trigger, rather than bypassing Vercel Preview
protection. See `PAYMENT_OPERATIONS.md` for secret names, live evidence and health
signals. The existing Vercel internal endpoint remains bearer-protected and is
not used by this scheduler; no Vercel bypass/CRON_SECRET was created.

## Secret-handling rules

- Credentials belong only in ignored local configuration or provider secret
  management (Vercel, Neon Function environments and CI secrets).
- `.env.example` contains placeholders only.
- Logs and status documents must contain names, IDs and states, never secret
  values or connection strings.
- A missing provider credential is a setup blocker, not a reason to weaken the
  server-only environment contract.
