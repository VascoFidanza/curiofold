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

- Independent encrypted off-provider backups or cross-region disaster recovery.
- Production PITR retention, production RPO/RTO, or production rollback controls.
- Reopening an older snapshot after replaying post-backup deletion restrictions.
- Full browser checkout against a separately configured restored application.

The actual snapshot restore, repository-level recovered reads/reconciliation
and Preview application rollback are demonstrated. The remaining production
backup/configuration/privacy gates must stay explicit; this is not permission
to launch real-money commerce.
