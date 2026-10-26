import { fileURLToPath } from 'node:url'

import { readMigrationFiles } from 'drizzle-orm/migrator'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Client } from 'pg'

// One database-scoped session lock, shared by every invocation of this runner.
export const migrationLockKey = [1_129_665_092, 1] as const

export class MigrationError extends Error {
  override readonly name = 'MigrationError'
  constructor(
    readonly code:
      | 'migration_configuration_invalid'
      | 'migration_busy'
      | 'migration_history_mismatch'
      | 'migration_failed',
  ) {
    super(code)
  }
}

export function migrationConnection(
  environment: Readonly<Record<string, string | undefined>>,
): string {
  if (
    environment.VERCEL_ENV === 'production' ||
    environment.NEXT_PUBLIC_ENVIRONMENT === 'production'
  ) {
    throw new MigrationError('migration_configuration_invalid')
  }
  const connectionString = environment.DATABASE_URL
  if (!connectionString)
    throw new MigrationError('migration_configuration_invalid')
  try {
    const url = new URL(connectionString)
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname ||
      url.hostname.includes('-pooler') ||
      !url.pathname.slice(1)
    ) {
      throw new Error('Invalid direct connection')
    }
  } catch {
    throw new MigrationError('migration_configuration_invalid')
  }
  return connectionString
}

/** Separate operator operation; never call from application startup or a route. */
export async function runDatabaseMigrations(
  connectionString: string,
  migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url)),
): Promise<void> {
  // Reject a transaction pooler even for programmatic callers: it cannot retain
  // the session lock across Drizzle's metadata queries and DDL transaction.
  migrationConnection({ DATABASE_URL: connectionString })
  const client = new Client({
    connectionString,
    application_name: 'curiofold-migrations',
    connectionTimeoutMillis: 10_000,
    lock_timeout: 5_000,
    statement_timeout: 60_000,
  })
  try {
    await client.connect()
    const lock = await client.query<{ acquired: boolean }>(
      'SELECT pg_try_advisory_lock($1, $2) AS acquired',
      [...migrationLockKey],
    )
    if (!lock.rows[0]?.acquired) throw new MigrationError('migration_busy')

    const migrations = readMigrationFiles({ migrationsFolder })
    if (
      migrations.length === 0 ||
      migrations.some(
        (migration, index) =>
          !Number.isSafeInteger(migration.folderMillis) ||
          migration.folderMillis <= (migrations[index - 1]?.folderMillis ?? 0),
      )
    ) {
      throw new MigrationError('migration_history_mismatch')
    }
    const tracked = await client.query<{ table_name: string | null }>(
      "SELECT to_regclass('drizzle.__drizzle_migrations') AS table_name",
    )
    if (tracked.rows[0]?.table_name) {
      const history = await client.query<{
        hash: string
        created_at: string
      }>(
        'SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at, id',
      )
      // Applied migrations must be an exact prefix. Refuse edited, missing or
      // out-of-order history instead of Drizzle silently skipping by timestamp.
      if (
        history.rows.some((row, index) => {
          const migration = migrations[index]
          if (!migration) return true
          return (
            row.hash !== migration.hash ||
            Number(row.created_at) !== migration.folderMillis
          )
        })
      ) {
        throw new MigrationError('migration_history_mismatch')
      }
    }
    await migrate(drizzle(client), { migrationsFolder })
  } catch (error) {
    if (error instanceof MigrationError) throw error
    // SQL/provider errors may include credentials or data; expose only a code.
    throw new MigrationError('migration_failed')
  } finally {
    // Disconnect releases the session lock even after rollback/interruption.
    await client.end()
  }
}
