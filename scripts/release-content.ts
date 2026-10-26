import {
  assertNonProductionSeedEnvironment,
  createDatabase,
  releaseReviewedStory,
} from '@curiofold/db'

import { readContentRelease } from './read-content-release'

async function main() {
  const [commit, manifestPath, ...extra] = process.argv.slice(2)
  if (
    !commit ||
    !/^[a-f0-9]{40,64}$/iu.test(commit) ||
    !manifestPath ||
    !/^content\/releases\/[a-z0-9-]+\.json$/u.test(manifestPath) ||
    extra.length
  ) {
    throw new Error(
      'Usage: pnpm content:release <full-git-sha> content/releases/<manifest>.json',
    )
  }
  assertNonProductionSeedEnvironment(
    process.env.NEXT_PUBLIC_ENVIRONMENT,
    process.env.CURIOFOLD_CONTENT_CONFIRMATION,
    process.env.VERCEL_ENV,
  )
  if (process.env.CURIOFOLD_CONTENT_REVIEW !== `approved:${commit}`) {
    throw new Error(
      'Human review must be acknowledged for this exact SHA using CURIOFOLD_CONTENT_REVIEW=approved:<sha>.',
    )
  }
  const { manifest, document } = readContentRelease(commit, manifestPath)
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.')
  const database = createDatabase(process.env.DATABASE_URL)
  try {
    const result = await releaseReviewedStory(database.client, {
      ...manifest,
      document,
      gitCommitSha: commit,
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } finally {
    await database.pool.end()
  }
}

main().catch(() => {
  // Do not emit SQL/provider errors containing connection details or paid text.
  process.stderr.write(
    'Content release failed. Check arguments, review acknowledgment, environment, manifest and publication state before retrying.\n',
  )
  process.exitCode = 1
})
