import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { compileStoryDocument } from '@curiofold/content'
import {
  assertNonProductionSeedEnvironment,
  createDatabase,
  seedDevelopmentCatalog,
  type DevelopmentSeedDocument,
} from '@curiofold/db'

const fixtureRoot = fileURLToPath(
  new URL('../content/stories', import.meta.url),
)
const fixtureKeys = ['clockwork-gardens', 'lantern-atlas'] as const

function gitCommitSha(): string {
  const candidate = process.env.VERCEL_GIT_COMMIT_SHA
  return candidate && /^[a-f0-9]{40,64}$/iu.test(candidate)
    ? candidate
    : '0'.repeat(40)
}

async function loadFixtureDocuments() {
  const documents: DevelopmentSeedDocument[] = []
  for (const fixtureKey of fixtureKeys) {
    const storyRoot = `${fixtureRoot}/${fixtureKey}`
    const locales = await readdir(storyRoot, { withFileTypes: true })
    for (const locale of locales.filter((entry) => entry.isDirectory())) {
      const files = await readdir(`${storyRoot}/${locale.name}`)
      for (const file of files.filter((name) => name.endsWith('.json'))) {
        const story = compileStoryDocument(
          JSON.parse(
            await readFile(`${storyRoot}/${locale.name}/${file}`, 'utf8'),
          ) as unknown,
        )
        if (
          story.document.storyKey !== fixtureKey ||
          story.document.locale !== locale.name
        ) {
          throw new Error('Development fixture path and identity disagree.')
        }
        if (story.document.publication.state === 'published') {
          documents.push({ gitCommitSha: gitCommitSha(), story })
        }
      }
    }
  }
  return documents
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
