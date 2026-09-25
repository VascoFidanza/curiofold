import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { compileStoryDocument } from '@curiofold/content'
import {
  assertNonProductionSeedEnvironment,
  createDatabase,
  seedDevelopmentCatalog,
} from '@curiofold/db'

const fixtureRoot = fileURLToPath(
  new URL('../content/stories/clockwork-gardens', import.meta.url),
)

function gitCommitSha(): string {
  const candidate = process.env.VERCEL_GIT_COMMIT_SHA
  return candidate && /^[a-f0-9]{40,64}$/iu.test(candidate)
    ? candidate
    : '0'.repeat(40)
}

async function loadFixtureDocuments() {
  const locales = await readdir(fixtureRoot, { withFileTypes: true })
  const documents = await Promise.all(
    locales
      .filter((entry) => entry.isDirectory())
      .flatMap(async (locale) => {
        const files = await readdir(`${fixtureRoot}/${locale.name}`)
        return Promise.all(
          files
            .filter((file) => file.endsWith('.json'))
            .map(async (file) => ({
              gitCommitSha: gitCommitSha(),
              story: compileStoryDocument(
                JSON.parse(
                  await readFile(
                    `${fixtureRoot}/${locale.name}/${file}`,
                    'utf8',
                  ),
                ) as unknown,
              ),
            })),
        )
      }),
  )
  return documents
    .flat()
    .filter(({ story }) => story.document.publication.state === 'published')
}

async function main() {
  assertNonProductionSeedEnvironment(
    process.env.NEXT_PUBLIC_ENVIRONMENT,
    process.env.CURIOFOLD_SEED_CONFIRMATION,
  )
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for development seeding.')
  }

  const database = createDatabase(connectionString)
  try {
    const result = await seedDevelopmentCatalog(
      database.client,
      await loadFixtureDocuments(),
    )
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } finally {
    await database.pool.end()
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Development seed failed.'}\n`,
  )
  process.exitCode = 1
})
