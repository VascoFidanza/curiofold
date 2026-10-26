import { execFileSync } from 'node:child_process'

import { createDatabase, releaseReviewedStory } from '@curiofold/db'

import {
  assertSaleableProductionStory,
  verifyProductionContentApproval,
  verifyProductionPublicationConnection,
} from './production-content-approval.mjs'
import { readContentRelease } from './read-content-release'

async function main() {
  const commit = process.env.CONTENT_SHA
  const manifestPath = process.env.CONTENT_MANIFEST
  const headSha = execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim()
  const approval = await verifyProductionContentApproval({
    env: process.env,
    commit,
    manifestPath,
    headSha,
  })
  if (!commit || !manifestPath) throw new Error('Missing release target.')
  // Never execute code from the content SHA; it must already belong to reviewed main.
  execFileSync('git', ['merge-base', '--is-ancestor', commit, headSha], {
    stdio: 'pipe',
  })
  const { manifest, document, compiled } = readContentRelease(
    commit,
    manifestPath,
  )
  assertSaleableProductionStory(compiled.document)
  const connection = process.env.CURIOFOLD_PRODUCTION_PUBLICATION_DATABASE_URL
  verifyProductionPublicationConnection(
    connection,
    process.env.CURIOFOLD_PRODUCTION_DATABASE_HOST,
  )
  if (!connection) throw new Error('Missing scoped publication connection.')
  const database = createDatabase(connection)
  try {
    const result = await releaseReviewedStory(database.client, {
      ...manifest,
      document,
      gitCommitSha: commit,
      operator: approval.operator,
      reason: `${manifest.reason.slice(0, 900)} [GitHub approval run ${approval.runId}]`,
    })
    process.stdout.write(
      `${JSON.stringify({ ...result, source: commit, manifest: manifestPath, approvalRun: approval.runId })}\n`,
    )
  } finally {
    await database.pool.end()
  }
}

main().catch(() => {
  // Do not log connection details, GitHub responses, or paid Story text.
  process.stderr.write(
    'Production publication failed. Verify owner approval, exact source/manifest, trusted main context and scoped connection. Inspect publication state before a newly approved retry.\n',
  )
  process.exitCode = 1
})
