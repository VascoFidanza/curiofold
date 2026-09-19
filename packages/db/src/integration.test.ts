import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { Client } from 'pg'
import { describe, expect, it } from 'vitest'

const integrationEnabled = process.env.RUN_DB_INTEGRATION === '1'

describe.skipIf(!integrationEnabled)('PostgreSQL integration harness', () => {
  it('is reserved for an isolated Testcontainers database', async () => {
    const { GenericContainer, Wait } = await import('testcontainers')
    const container = await new GenericContainer('postgres:18-alpine')
      .withEnvironment({
        POSTGRES_DB: 'curiofold_test',
        POSTGRES_PASSWORD: 'curiofold_test',
        POSTGRES_USER: 'curiofold_test',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(
        Wait.forLogMessage(/database system is ready to accept connections/),
      )
      .start()

    const connectionString = `postgresql://curiofold_test:curiofold_test@${container.getHost()}:${String(container.getMappedPort(5432))}/curiofold_test`
    const client = new Client({ connectionString })

    try {
      await client.connect()
      const migrationDirectory = fileURLToPath(
        new URL('../drizzle', import.meta.url),
      )
      const migrationFiles = (await readdir(migrationDirectory))
        .filter((file) => file.endsWith('.sql'))
        .sort()

      for (const migrationFile of migrationFiles) {
        const migration = await readFile(
          `${migrationDirectory}/${migrationFile}`,
          'utf8',
        )
        for (const statement of migration.split('--> statement-breakpoint')) {
          if (statement.trim()) {
            await client.query(statement)
          }
        }
      }

      const tables = await client.query<{ table_name: string }>(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public'
         ORDER BY table_name`,
      )

      expect(tables.rows.map((row) => row.table_name)).toEqual(
        expect.arrayContaining([
          'audit_events',
          'reading_progress',
          'stories',
          'story_localizations',
          'story_versions',
          'users',
        ]),
      )
    } finally {
      await client.end()
      await container.stop()
    }
  })
})
