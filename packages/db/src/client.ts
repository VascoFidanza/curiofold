import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema'

export function createDatabase(connectionString: string) {
  const pool = new Pool({ connectionString, max: 5 })
  return {
    client: drizzle(pool, { schema }),
    pool,
  }
}
