# Reviewed content publication

## Operator boundary

`pnpm content:release <full-git-sha> content/releases/<manifest>.json` publishes,
corrects, rolls back or archives one reviewed Story localization. It is a privileged
operator command, not a browser API or an AI-agent tool. Use a scoped database
connection injected into the process; never paste credentials in Git or commands.

This first operator path is **nonproduction only**. It rejects production even
when confirmation is supplied. Production execution needs a separately approved
protected workflow, database role/secret scope and initial-release authorization.
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
Production approval enforcement is deliberately not represented by a client-supplied
boolean or the operator acknowledgment; configure and verify the protected human-approved
workflow before enabling production execution. AI content generation remains post-V1.
