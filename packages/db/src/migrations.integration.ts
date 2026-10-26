import { cp, mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Client } from 'pg'
import { expect } from 'vitest'

import { migrationLockKey, runDatabaseMigrations } from './migrations'

/** Runs only inside the existing disposable PostgreSQL integration harness. */
export async function assertMigrationIntegration(
  client: Client,
  connectionString: string,
) {
  const directory = await mkdtemp(join(tmpdir(), 'curiofold-migrations-'))
  const realFolder = fileURLToPath(new URL('../drizzle', import.meta.url))
  const brokenFolder = join(directory, 'broken')
  const previousFolder = join(directory, 'previous')
  const contender = new Client({ connectionString })
  try {
    await mkdir(join(brokenFolder, 'meta'), { recursive: true })
    await writeFile(
      join(brokenFolder, 'meta/_journal.json'),
      JSON.stringify({
        entries: [{ when: 1, tag: 'broken', breakpoints: true }],
      }),
    )
    await writeFile(
      join(brokenFolder, 'broken.sql'),
      'CREATE TABLE migration_failure_probe (id integer);--> statement-breakpoint\nSELECT * FROM deliberately_missing_migration_table;',
    )
    await expect(
      runDatabaseMigrations(connectionString, brokenFolder),
    ).rejects.toThrow('migration_failed')
    expect(
      (
        await client.query<{ name: string | null }>(
          "SELECT to_regclass('migration_failure_probe') AS name",
        )
      ).rows[0]?.name,
    ).toBeNull()
    expect(
      (
        await client.query<{ count: string }>(
          'SELECT count(*) FROM drizzle.__drizzle_migrations',
        )
      ).rows[0]?.count,
    ).toBe('0')

    // A failed run releases its session lock. A different connection can acquire
    // it, and another runner fails before any schema/history change.
    await contender.connect()
    expect(
      (
        await contender.query<{ acquired: boolean }>(
          'SELECT pg_try_advisory_lock($1, $2) AS acquired',
          [...migrationLockKey],
        )
      ).rows[0]?.acquired,
    ).toBe(true)
    await expect(runDatabaseMigrations(connectionString)).rejects.toThrow(
      'migration_busy',
    )
    expect(
      (
        await client.query<{ name: string | null }>(
          "SELECT to_regclass('users') AS name",
        )
      ).rows[0]?.name,
    ).toBeNull()
    // Model an interrupted worker: disconnect without an explicit unlock.
    await contender.end()

    await cp(realFolder, previousFolder, { recursive: true })
    const journal = JSON.parse(
      await readFile(join(realFolder, 'meta/_journal.json'), 'utf8'),
    ) as { entries: unknown[] }
    const previousJournal = {
      ...journal,
      entries: journal.entries.slice(0, -1),
    }
    await writeFile(
      join(previousFolder, 'meta/_journal.json'),
      JSON.stringify(previousJournal),
    )
    await runDatabaseMigrations(connectionString, previousFolder)
    expect(
      (
        await client.query<{ count: string }>(
          'SELECT count(*) FROM drizzle.__drizzle_migrations',
        )
      ).rows[0]?.count,
    ).toBe(String(previousJournal.entries.length))

    // Upgrade through the same tracked runner, then safely retry it.
    await runDatabaseMigrations(connectionString)
    const history = await client.query(
      'SELECT * FROM drizzle.__drizzle_migrations ORDER BY id',
    )
    expect(history.rows).toHaveLength(journal.entries.length)
    await runDatabaseMigrations(connectionString)
    expect(
      (
        await client.query(
          'SELECT * FROM drizzle.__drizzle_migrations ORDER BY id',
        )
      ).rows,
    ).toEqual(history.rows)

    // A stale release cannot silently ignore migrations already applied.
    await expect(
      runDatabaseMigrations(connectionString, previousFolder),
    ).rejects.toThrow('migration_history_mismatch')
    await writeFile(
      join(previousFolder, 'meta/_journal.json'),
      JSON.stringify(journal),
    )
    const first = journal.entries[0] as { tag: string }
    const path = join(previousFolder, `${first.tag}.sql`)
    await writeFile(path, `${await readFile(path, 'utf8')}\n-- edited history`)
    await expect(
      runDatabaseMigrations(connectionString, previousFolder),
    ).rejects.toThrow('migration_history_mismatch')
    await runDatabaseMigrations(connectionString)
  } finally {
    await contender.end()
    await rm(directory, { recursive: true, force: true })
  }
}
