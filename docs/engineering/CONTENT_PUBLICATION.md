# Reviewed content publication

## Operator boundary

`pnpm content:release <full-git-sha> content/releases/<manifest>.json` publishes,
corrects, rolls back or archives one reviewed Story localization. It is a privileged
operator command, not a browser API or an AI-agent tool. Use a scoped database
connection injected into the process; never paste credentials in Git or commands.

This first operator path is **nonproduction only**. It rejects production even
when confirmation is supplied. Both release and synthetic seeding additionally
reject `VERCEL_ENV=production`, even if `NEXT_PUBLIC_ENVIRONMENT` is accidentally
set to an allowed nonproduction value. `NODE_ENV=production` alone is not rejected:
Preview builds legitimately use that Node mode. These checks prevent configuration
mistakes; they do not authenticate an operator or replace database role isolation.
Production execution uses the separate dormant workflow below, never an override
to this command. It still needs owner-approved activation and scoped credentials.
No production resource or automated publication schedule is created here.

## Review and release

1. Author/validate a StoryDocument and a release manifest in Git. Include human
   source/language/media-rights review. Merge only after the human reviewer approves
   the exact content; the AI must not approve its own work. A metadata name is not
   proof that this review occurred.
2. Manifest fields: `schemaVersion: "content-release/v1"`, `action: "publish"`
   or `"archive"`, `storyPath`, `operator`, `reason`, and `expectedCurrent`.
   Initial publication uses `null`; existing publication uses
   `{ "revision": 2, "state": "published" }` (or `"archived"`).
3. Select the full reviewed Git SHA. Both manifest and Story are read with `git show`
   from that SHA, not from mutable working files. New content need not be on the
   synthetic seed allowlist. Publish predecessors before a correction.
4. Inject `DATABASE_URL`, `NEXT_PUBLIC_ENVIRONMENT=preview` (or local/test/staging),
   `CURIOFOLD_CONTENT_CONFIRMATION=nonproduction` and
   `CURIOFOLD_CONTENT_REVIEW=approved:<full-git-sha>`. The acknowledgment is an
   operator safeguard, **not authentication or automated verification of human review**.
   Only trusted operators/approved CI may receive the privileged database connection.
   These variables belong to the release process, not the browser or ordinary web runtime.
5. Run the command. Check its result and the catalogue/detail/entitled Reader on
   the selected environment. Inspect database publication state if the connection
   fails during commit before retrying. Replaying an already-applied target is a no-op.

`content/releases/rehearsal-clockwork.json` is explicitly a fictional nonproduction
CLI rehearsal, not real catalogue content or launch approval.

## Correction, rollback and archive

- Correction: release a new immutable revision with a stored predecessor and the
  expected current revision/state. Conflicting hashes for an existing revision fail.
- Rollback: select the earlier committed reviewed document, use `publish`, record a
  rollback reason and the actual current revision/state. Old versions remain intact.
- Archive: select the exact currently published document and `archive`. It disappears
  from public discovery/new purchases while current owners retain the safe Reader.
- Slug changes and restoration of legally withdrawn Stories are rejected; they need
  their own redirect/legal review. Emergency withdrawal is not implemented by this CLI.

One short transaction serializes release/import operations, compares expected state,
persists versions, updates metadata/pointer and appends audit evidence. Failed
operations leave neither partial publication nor audit evidence. Search and catalogue
read the current database projection; there is no separate index/cache to invalidate.
Existing entitlements, wallet state and completed reading state are not changed.

## Validation and remaining release gates

Hosted isolated PostgreSQL 18 tests rehearse initial release, correction, immutable
conflict, concurrent stale-state rejection, rollback, archive with retained ownership,
audit history and the committed-source CLI. Manifest tests reject traversal, unsupported
actions and incomplete review intent. Production and missing acknowledgment fail closed.

Real launch Stories, reviewer, languages and media rights still require OD-002/008/009.

## Editorial preparation — internal working standard, not launch approval

V1 uses reviewed English Stories; the AI production agent remains post-V1.
Start with a narrow reader question and a defensible scope. Build a claim/source
matrix: factual claim, primary evidence, publication date, limitations and reviewer
disposition. Prefer primary research and authoritative records; corroborate disputed
or consequential claims independently. Distinguish established fact, inference and
uncertainty. Never fabricate citations or imply that a source was read when it was not.

Structure each Story around a clear hook, an explanatory narrative, useful sections,
and a satisfying conclusion. Sources/endnotes must let a reader trace important
claims. Check quotations, dates, figures, contradictions, attribution and media rights.
Use the existing semantic blocks and Curiofold Reader typography; avoid decorative
complexity that harms mobile reading or accessibility. Figures need meaningful alt text.

Human approval of the exact revision remains mandatory after factual, language,
rights and rendered mobile/desktop review. Failed checks return the draft for revision;
AI cannot approve its own output. Record corrections through immutable revisions.
Editorial leadership must approve this working standard before treating it as final
policy. No agent infrastructure or automatic publication is introduced here.
Production approval enforcement is not represented by a client-supplied boolean or
the nonproduction operator acknowledgment. AI content generation remains post-V1.

## Protected production publication — prepared, NOT activated

`.github/workflows/publish-content.yml` is manual-only, serialized and restricted
to trusted `main` execution code. It does not run on pushes/PRs. The repository
activation Config defaults off. No production environment, role, credential or
publication was created during implementation.

The command `scripts/release-production-content.ts` verifies the current first-attempt
GitHub run against GitHub's API: exact repository/workflow/main SHA, in-progress
manual dispatch, successful main-push CI and CodeQL for that execution SHA, and an
actual `production-content` environment approval by `VascoFidanza`. Its review
comment must be exactly `release <content_sha> <manifest_path>`. Bypassing/removing
the reviewer rule, missing/mismatched review, rejected review, rerun or unavailable
API fails closed before a database is opened. The API calls are bounded by ten-second
timeouts. This proves recorded GitHub review identity, not that an agent using the
owner's credentials is a human: agents must never submit this approval.

Content is read only from the full reviewed SHA, which must be an ancestor of the
trusted execution SHA. The input SHA is never checked out or executed. The existing
compiler, expected-state transaction, immutable versions and audit operation are
reused. Audit evidence records the verified reviewer and approval run. Known
fictional fixture identities and reserved/example source domains are rejected;
this is a safeguard, not automated factual or licensing review. Corrections,
rollback and archive use committed manifests with the actual expected state.

### Exact activation actions — only after explicit production authorization

1. Promote the reviewed application/workflow to protected `main` through the normal
   release process. Require its CI and CodeQL to pass. Configure GitHub account MFA.
2. GitHub repository **Settings → Environments → production-content**: require
   reviewer `VascoFidanza`, restrict deployment branches to `main`, and disable admin
   bypass. Required environment reviewers are supported for this **public** repository
   on GitHub Free; no upgrade is needed. Do not move the secret to repository scope
   if environment protection is unavailable.
3. Using the separately approved production database, provision a login role
   `curiofold_publisher`, with schema USAGE; SELECT/INSERT on `stories`,
   `story_localizations`, `story_versions`; UPDATE on `story_localizations`; INSERT
   on `audit_events`. No DELETE, audit/history UPDATE, financial/identity table
   access, role membership, schema ownership or DDL authority. Rehearse the grants
   against the actual production provider before activation. Do not use the database
   owner, runtime, migration or nonproduction connection.
4. Store **Secret** `CURIOFOLD_PRODUCTION_PUBLICATION_DATABASE_URL` only in that
   GitHub environment. Use the dedicated role, approved production hostname and
   `sslmode=verify-full` (no extra connection options). Store the exact hostname as
   environment **Config** `CURIOFOLD_PRODUCTION_DATABASE_HOST`. Neither belongs in
   Vercel/web-runtime/client variables. No new personal GitHub token is needed:
   the workflow uses the read-only built-in token for review/check evidence.
5. Only when owner-approved, set repository **Config**
   `CURIOFOLD_PRODUCTION_PUBLICATION_ENABLED=true`. This is not live-payment or
   initial-public-launch authorization.
6. **Actions → Publish reviewed production Story → Run workflow**, branch `main`,
   exact source SHA and `content/releases/<name>.json`. Review that source/manifest
   and approve the waiting `production-content` job with the exact comment above.
   Do not rerun an old attempt; dispatch a new request and approve it again. If a
   connection failed during commit, inspect publication/audit state before retrying.
7. Verify the resulting metadata, entitled Reader and audit evidence. Production
   activation and this genuine protected workflow rehearsal remain **unperformed**;
   unit API fixtures and local PostgreSQL are not live production acceptance.

The dedicated-role PostgreSQL rehearsal covers publication/retry, correction,
rollback/archive, denied financial/identity/history mutation, financial-record
preservation and rollback on missing audit authority. Approval/context/API-failure
and fixture/connection guards have executable negative-path coverage in
`pnpm test:publication`, included in normal validation. No new provider or cost.

GitHub primary references: [environment protection](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments),
[recorded review API](https://docs.github.com/en/rest/actions/workflow-runs#get-the-review-history-for-a-workflow-run).
