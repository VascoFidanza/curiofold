import {
  MigrationError,
  migrationConnection,
  runDatabaseMigrations,
} from './migrations'

async function main() {
  if (process.argv.length !== 2)
    throw new MigrationError('migration_configuration_invalid')
  await runDatabaseMigrations(migrationConnection(process.env))
  process.stdout.write('Database migrations complete.\n')
}

main().catch((error: unknown) => {
  const code = error instanceof MigrationError ? error.code : 'migration_failed'
  process.stderr.write(
    `${code}: check the direct nonproduction connection, migration history and active runner before retrying.\n`,
  )
  process.exitCode = 1
})
