import { createDatabase } from '@curiofold/db/client'

type Database = ReturnType<typeof createDatabase>

const databaseScope = globalThis as typeof globalThis & {
  curiofoldDatabase?: Database
}

export function getDatabase(): Database {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('Database configuration is unavailable.')
  }

  databaseScope.curiofoldDatabase ??= createDatabase(connectionString)
  return databaseScope.curiofoldDatabase
}
