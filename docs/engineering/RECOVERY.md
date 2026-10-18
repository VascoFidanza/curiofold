# Nonproduction recovery evidence and runbook

## Rehearsal — 2026-10-15 (CRFD-73)

Only `curiofold-nonproduction` (`bitter-hat-89380353`) and protected Vercel
Preview were used. No production resources or real-money payments were changed.

- Created actual Neon snapshot `snap-bitter-thunder-b1z6hnwi` at 08:56:15 UTC,
  from `br-purple-forest-b1cah3ow`.
- Restored snapshot into `br-red-bird-b1tflk80` at 08:56:32 UTC. Both snapshot
  and rehearsal branch expire on 2026-10-17; they are not long-term backups.
- Source and restored data matched: 10 orders, 6 ledger entries, 4 credit grants,
  5 entitlements, one pending-deletion account and zero wallet discrepancies.
- Ordered JSONB row fingerprints matched independently on both branches:

| Records        | MD5 comparison fingerprint         |
| -------------- | ---------------------------------- |
| Payment orders | `d275ff39407a4aff13205de5d619474d` |
| Ledger entries | `65bfa62bfde279cdb6f1bc10220a76f2` |
| Entitlements   | `c6a845a227a6a82de24d02dec0c97b57` |

These fingerprints compare rows; they are not cryptographic backup signatures.
Repository functions executed against the restored connection confirmed the
existing customer's 4 credits, two owned Stories, fulfilled €1.30 direct order,
successful Reader resolution and healthy reconciliation of all three wallets.
The disposable deleted account remained `pending_deletion`; its Clerk identity
remained banned with both sessions revoked. No identity was reactivated.

### Restore routing finding and correction

The restore call omitted `finalize`; Neon defaults it to true for a new branch.
It moved the existing compute and default/name to the restored database. This
was detected and corrected in nonproduction, not treated as an isolated restore.
Financial fingerprints were compared again before correction and still matched.

Cleanup scheduling was paused during routing correction. The temporary compute
`ep-twilight-frog-b1hmtag3` was removed (no database data deleted); the existing
`ep-dark-unit-b1s7k5cz` was reassigned to the original branch. The original branch
is again default `main`, with the unchanged application connection hostname.
Both database branches were preserved. The five-minute cleanup schedule resumed
and its actual 09:05 UTC invocation completed with zero failed jobs.

### Deployment rollback

The protected CRFD-72 feature alias was reassigned from deployment
`dpl_5ebw68B34eg5CodUKwCyVyo95dHL` (`173639d`) to the previous ready deployment
`dpl_DccpdpBrjBjfFQriCXRc5nuDi2Lq` (`c311873`). Browser catalogue acceptance
passed on the rolled-back deployment. The alias was returned to the newer
deployment and browser catalogue acceptance passed again. This was an actual
Preview alias rollback, not a production rollback or a schema downgrade.

After PR #61 merged, the canonical `development` deployment
`dpl_GAMCMP1Yp6U5PE2p3xCwnYdXZNK9` (`319b749`) became READY. Browser reload
confirmed the account, 4-credit wallet, original confirmed purchases and new
deletion confirmation surface remained functional after routing restoration.

## Repeat safely

### Logical backup portability rehearsal — 2026-10-18 (CRFD-79)

Actual PostgreSQL 18 `pg_dump --format=custom --no-owner --no-acl` read the
allowlisted nonproduction **direct** endpoint over verified TLS. The archive was
encrypted with AES-256-GCM and a random 256-bit key, then read back, authenticated
and restored with `pg_restore --single-transaction --exit-on-error` into an empty
loopback-only PostgreSQL 18.6 cluster on port 55479. Tampered ciphertext was
rejected before restore. No plaintext dump file was written.

Restored/source/baseline fingerprints matched for payment orders, ledger,
credit grants, wallets and entitlements. Orders/ledger/entitlement fingerprints
match the October 15 evidence above; grants were `537a363632d8794e8c181aa13e7e081b`
and wallets `4e39f7538d17ca47a1a4cc8e272988a9`. Repository wallet reconciliation
reported zero discrepancies and `verifyRecoveryPrivacy` passed. No provider call,
payment creation, source mutation, cutover or production operation occurred.

An initial comparison exposed server timezone differences in JSON timestamps;
canonical UTC sessions resolved the discrepancy without changing records.
The temporary restored server was stopped after acceptance. Private encrypted
artifacts/key remain in owner-only local temporary storage, outside Git. They are
rehearsal material, **not durable backups or independent key custody**.

Repeat with `pnpm exec tsx scripts/rehearse-logical-backup.ts`, injecting
`CURIOFOLD_BACKUP_SOURCE_URL` (exact allowlisted direct source) and
`CURIOFOLD_BACKUP_RESTORE_URL` (127.0.0.1, explicit port, empty
`curiofold_recovery` database). Start/stop the disposable loopback cluster separately.
The operator script caps the in-memory archive at 128 MiB and commands at two
minutes; it fails closed rather than serving as a general production backup tool.
Credentials are passed to libpq via environment, never CLI URLs. The encrypted
format is nonce (12 bytes), GCM tag (16 bytes), ciphertext; keep the key private.

**Still required:** independently managed durable storage and key custody,
scheduled backup/retention/failure alerts, actual older-backup deletion remediation,
and production recovery approval/configuration. This rehearsal closes portability
and logical-restore evidence only, not these remaining launch requirements.

1. Resolve project, original branch, compute, aliases and exact commits by ID.
   Record a baseline of orders, grants, ledger, wallet sums, entitlements,
   deletion markers and outstanding financial work. Never use production for a
   rehearsal or copy credentials/data into source control.
2. Capture current deletion restrictions separately from the recovery point.
   Before reopening any older restore, compare all deletion markers with the
   current authoritative database; reapply missing restrictions and Clerk bans,
   and remove restored reading history. Never assume an older backup contains
   later deletion requests. This rehearsal used a snapshot after deletion.
3. Create a named expiring snapshot. Call `restore_snapshot` with explicit
   `finalize: false` for an isolated rehearsal. Inspect branches and computes
   after the operation; do not infer isolation from the requested branch name.
4. Use only the restored branch's connection in the validation process. Keep
   workers/triggers disabled there. Compare exact record fingerprints, wallet
   reconciliation and real repository reads. Do not create payments to test a
   restore. Stop on mismatch; never automatically repair financial records.
5. If a cutover is intended, freeze affected writes first, reconcile the gap
   since the recovery point and use an explicit approved cutover. Do not swap
   computes/defaults as an incidental test step.
6. For application rollback, use an isolated protected Preview alias and a
   previous READY, schema-compatible deployment. Verify browser behavior,
   return the alias to its original deployment, and verify again.
7. Confirm original compute/default/alias/scheduler state, canonical account
   and ownership behavior, and redacted worker logs. Preserve evidence before
   allowing temporary branches/snapshots to expire.

## What this does not certify

### Read-only privacy acceptance gate

Before reopening a restore, freeze authoritative writes and leave restored traffic
and workers disabled. Run `verifyRecoveryPrivacy(current.client, restored.client)`
from `@curiofold/db` using separately scoped connections. It compares repeatable-read
snapshots and rejects missing/remapped restricted identities, revived access, and
restored reading history or staff privileges for deletion-request accounts.
It returns only `{ verified: true }`; errors contain no identity references.
Never log the internal snapshots. It does not repair, erase or modify financial
records. Failed acceptance requires operator remediation and a fresh verification.

This gate is not a Clerk ban/session check, a cutover lock or a deletion replay
mechanism. Separately verify Clerk restrictions and keep writes frozen through
cutover. An unavailable authoritative database is a blocker, not permission to
skip the comparison. Actual older-backup remediation remains unverified.

### Reapply restrictions before opening an isolated restore (CRFD-80)

`pnpm exec tsx scripts/reapply-recovery-restrictions.ts` is an explicit privileged
nonproduction operator command, not a scheduled action or public API. Inject:

- `CURIOFOLD_RECOVERY_SOURCE_URL`: current authoritative allowlisted nonproduction
  database, never the older backup itself.
- `CURIOFOLD_RECOVERY_TARGET_URL`: isolated loopback `curiofold_recovery` database
  with explicit port; no application traffic or workers.
- Existing Development `CLERK_SECRET_KEY`, never a live key.
- `CURIOFOLD_RECOVERY_CONFIRMATION=isolated-nonproduction-writes-frozen` only after
  actually freezing source writes and closing restored traffic. The value is an
  operator acknowledgment, not proof of those conditions.

The command captures current restricted identities, preflights every mapping under
ordered target row locks and fails on missing/remapped accounts before any writes.
It reapplies denial, clears deletion-account reading history and verification
metadata, revokes staff roles and records audit evidence. No financial records or
ownership evidence are changed, and pending deletion is never downgraded.
After commit it bans Clerk identities and revokes active sessions with bounded
requests. Provider failure leaves the application denied and the command failed;
keep traffic closed, fix the cause and repeat. Final verification re-reads current
restrictions; it cannot make independent database snapshots atomic across cutover.

PostgreSQL tests reconstruct older active/history/staff state, reject bad mappings,
inject provider failure, repeat remediation and compare retained financial exports.
The tests alone are not evidence of a live drill; the later acceptance below
supersedes that outstanding live-evidence limitation. Durable backup/key-custody
configuration remains required. Do not use this local-only tool
to cut over production or claim irreversible retention cleanup approval.

### Genuine older-backup and Clerk acceptance — 2026-10-18

- At 18:14:53 UTC, created one disposable Clerk Development identity and a genuine
  active session, then linked its nonproduction application account. No credits,
  entitlement, payment or other financial records were added for this account.
- Took an actual encrypted logical backup and restored it into isolated loopback
  PostgreSQL while that account was active. This was not reconstructed old state.
- At 18:15:12 UTC, accepted application deletion and ran cleanup with actual Clerk
  API calls. Independent provider reads confirmed `banned=true` and session `revoked`.
- At 18:15:35 UTC, the older restored account was still `active` and the privacy
  acceptance gate correctly rejected it. Financial fingerprints still matched.
- Held a brief SHARE lock write freeze on authoritative identity/progress/staff and
  financial tables while the existing guarded remediation command captured current
  restrictions and reapplied them to the isolated target. No restored traffic or
  worker was enabled. Locks were released in `finally`; no production was involved.
- Actual command passed at 18:15:45 UTC; independent verification at 18:16:04 found
  restored `pending_deletion`, passing privacy acceptance and zero wallet discrepancies.
- Repeated under the same controlled freeze at 18:16:21; independent reads at
  18:16:23 again confirmed Clerk ban, revoked session, restored denial and unchanged
  source/restored financial fingerprints (all five hashes in CRFD-79 above).
- Local restore server stopped; temporary plaintext cluster and private fixture
  scaffolding removed. Disposable identity stays banned and its application deletion
  evidence remains. Encrypted rehearsal artifacts are private temporary material.

This closes the genuine pre-deletion-backup/provider-remediation acceptance case.
It does not certify every historical schema, missing-account reconstruction,
production cutover or durable backup operations. Failed identity mapping must
still keep a restore closed for explicit operator review.

- Independent encrypted off-provider backups or cross-region disaster recovery.
- Production PITR retention, production RPO/RTO, or production rollback controls.
- Reopening an older snapshot after replaying post-backup deletion restrictions.
- Full browser checkout against a separately configured restored application.

The actual snapshot restore, repository-level recovered reads/reconciliation
and Preview application rollback are demonstrated. The remaining production
backup/configuration/privacy gates must stay explicit; this is not permission
to launch real-money commerce.
