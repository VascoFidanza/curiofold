import { spawnSync } from 'node:child_process'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createDatabase,
  reconcileWallets,
  verifyRecoveryPrivacy,
} from '@curiofold/db'

let stage = 'configuration'
/** Nonproduction operator rehearsal, not a scheduled or production backup service. */
async function main() {
  const source = new URL(process.env.CURIOFOLD_BACKUP_SOURCE_URL ?? '')
  const target = new URL(process.env.CURIOFOLD_BACKUP_RESTORE_URL ?? '')
  if (
    source.hostname !==
      'ep-dark-unit-b1s7k5cz.c-5.eu-central-1.aws.neon.tech' ||
    source.pathname !== '/curiofold' ||
    target.hostname !== '127.0.0.1' ||
    target.pathname !== '/curiofold_recovery' ||
    !target.port
  )
    throw new Error('Isolated nonproduction targets required')
  source.searchParams.set('sslmode', 'verify-full')
  // JSON timestamps must compare canonically across differently configured servers.
  source.searchParams.set('options', '-c timezone=UTC')
  target.searchParams.set('options', '-c timezone=UTC')
  const original = createDatabase(source.toString())
  const restored = createDatabase(target.toString())
  const fingerprint = async (db: typeof original) => {
    const result = await db.pool.query(`SELECT
      (SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY id)::text) FROM payment_orders t) orders,
      (SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY id)::text) FROM wallet_entries t) ledger,
      (SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY id)::text) FROM credit_grants t) grants,
      (SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY id)::text) FROM wallet_accounts t) wallets,
      (SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY id)::text) FROM story_entitlements t) entitlements`)
    return JSON.stringify(result.rows[0])
  }
  const run = (
    program: string,
    args: string[],
    connection: URL,
    input?: Buffer,
  ) => {
    const result = spawnSync(program, args, {
      env: {
        ...process.env,
        PGHOST: connection.hostname,
        PGPORT: connection.port || '5432',
        PGUSER: decodeURIComponent(connection.username),
        PGPASSWORD: decodeURIComponent(connection.password),
        PGDATABASE: connection.pathname.slice(1),
        PGSSLMODE:
          connection.hostname === '127.0.0.1' ? 'disable' : 'verify-full',
        PGCONNECT_TIMEOUT: '15',
        PGSSLROOTCERT:
          connection.hostname === '127.0.0.1' ? undefined : 'system',
      },
      input,
      maxBuffer: 128 * 1024 * 1024,
      timeout: 120_000,
    })
    // Never print child stderr: connection failures can contain sensitive details.
    if (result.error || result.status !== 0) {
      const diagnostic = result.stderr?.toString() ?? ''
      console.error(
        JSON.stringify({
          command: program,
          extension: diagnostic.includes('extension'),
          permission: diagnostic.includes('permission denied'),
          role: diagnostic.includes('does not exist'),
          ssl: diagnostic.includes('SSL'),
          password: diagnostic.includes('password'),
          configuration: diagnostic.includes('unrecognized configuration'),
          status: result.status,
        }),
      )
      throw new Error('PostgreSQL backup/restore command failed')
    }
    return result.stdout
  }
  try {
    stage = 'empty-target-check'
    const tables = await restored.pool.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') LIMIT 1",
    )
    if (tables.rowCount) throw new Error('Restore target must be empty')
    const before = await fingerprint(original)
    stage = 'pg-dump'
    const archive = run(
      'pg_dump',
      ['--format=custom', '--no-owner', '--no-acl'],
      source,
    )
    stage = 'encryption'
    const key = randomBytes(32)
    const nonce = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, nonce)
    const encrypted = Buffer.concat([cipher.update(archive), cipher.final()])
    const directory = await mkdtemp(join(tmpdir(), 'curiofold-backup-'))
    await writeFile(
      join(directory, 'archive.gcm'),
      Buffer.concat([nonce, cipher.getAuthTag(), encrypted]),
      { mode: 0o600, flag: 'wx' },
    )
    await writeFile(join(directory, 'rehearsal.key'), key, {
      mode: 0o600,
      flag: 'wx',
    })
    const saved = await readFile(join(directory, 'archive.gcm'))
    const open = (bytes: Buffer) => {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        key,
        bytes.subarray(0, 12),
      )
      decipher.setAuthTag(bytes.subarray(12, 28))
      return Buffer.concat([
        decipher.update(bytes.subarray(28)),
        decipher.final(),
      ])
    }
    const tampered = Buffer.from(saved)
    tampered[tampered.length - 1] = tampered[tampered.length - 1]! ^ 1
    let rejected = false
    try {
      open(tampered)
    } catch {
      rejected = true
    }
    if (!rejected) throw new Error('Archive authentication failed')
    // Authenticate the entire archive before any database write.
    stage = 'pg-restore'
    run(
      'pg_restore',
      [
        '--no-owner',
        '--no-acl',
        '--single-transaction',
        '--exit-on-error',
        '--dbname=curiofold_recovery',
      ],
      target,
      open(saved),
    )
    stage = 'financial-comparison'
    if (
      before !== (await fingerprint(restored)) ||
      before !== (await fingerprint(original))
    )
      throw new Error('Financial baseline changed; recovery not certified')
    stage = 'privacy-verification'
    await verifyRecoveryPrivacy(original.client, restored.client)
    stage = 'wallet-reconciliation'
    const reconciliation = await reconcileWallets(restored.client)
    if (reconciliation.discrepancies.length)
      throw new Error('Restored wallet reconciliation failed')
    console.info(
      JSON.stringify({
        event: 'logical_backup_rehearsal_passed',
        directory,
        financialFingerprints: JSON.parse(before),
        privacy: true,
        tamperRejected: true,
      }),
    )
  } finally {
    await original.pool.end()
    await restored.pool.end()
  }
}

main().catch(() => {
  console.error(
    `Logical backup rehearsal failed at ${stage}; inspect isolated state without logging credentials.`,
  )
  process.exitCode = 1
})
