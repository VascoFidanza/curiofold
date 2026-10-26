import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'

import {
  assertSaleableProductionStory,
  verifyProductionContentApproval,
  verifyProductionPublicationConnection,
} from './production-content-approval.mjs'

const commit = 'a'.repeat(40)
const headSha = 'b'.repeat(40)
const manifestPath = 'content/releases/reviewed-story.json'
const env = {
  CURIOFOLD_PRODUCTION_PUBLICATION_ENABLED: 'true',
  GITHUB_ACTIONS: 'true',
  GITHUB_REPOSITORY: 'VascoFidanza/curiofold',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_WORKFLOW_REF:
    'VascoFidanza/curiofold/.github/workflows/publish-content.yml@refs/heads/main',
  GITHUB_SHA: headSha,
  GITHUB_RUN_ATTEMPT: '1',
  GITHUB_RUN_ID: '1234',
  GITHUB_TOKEN: 'test-only-not-a-credential',
}
const run = {
  id: 1234,
  run_attempt: 1,
  event: 'workflow_dispatch',
  head_branch: 'main',
  head_sha: headSha,
  path: '.github/workflows/publish-content.yml',
  repository: { full_name: env.GITHUB_REPOSITORY },
  head_repository: { full_name: env.GITHUB_REPOSITORY },
  status: 'in_progress',
  conclusion: null,
}
const approval = {
  state: 'approved',
  environments: [{ name: 'production-content' }],
  user: { login: 'VascoFidanza', type: 'User' },
  comment: `release ${commit} ${manifestPath}`,
}
function fetcher(data = run, reviews = [approval]) {
  return async (url, options) => {
    assert.match(
      url,
      /^https:\/\/api.github.com\/repos\/VascoFidanza\/curiofold\/actions\/(runs\/1234(?:\/approvals)?|workflows\/(ci|codeql)\.yml\/runs\?head_sha=[a-f0-9]{40}&branch=main&event=push&status=completed&per_page=5)$/u,
    )
    assert.equal(options.redirect, 'error')
    assert.ok(options.signal instanceof AbortSignal)
    return Response.json(
      url.includes('/workflows/')
        ? {
            workflow_runs: [
              {
                ...run,
                event: 'push',
                status: 'completed',
                conclusion: 'success',
              },
            ],
          }
        : url.endsWith('/approvals')
          ? reviews
          : data,
    )
  }
}
const input = { env, commit, manifestPath, headSha }

test('requires real owner approval for the exact source SHA and manifest', async () => {
  assert.deepEqual(
    await verifyProductionContentApproval({ ...input, fetcher: fetcher() }),
    {
      operator: 'github:VascoFidanza',
      runId: '1234',
    },
  )
})
test('rejects untrusted execution context before making any API call', async () => {
  for (const override of [
    { CURIOFOLD_PRODUCTION_PUBLICATION_ENABLED: '' },
    { GITHUB_ACTIONS: '' },
    { GITHUB_TOKEN: '' },
    { GITHUB_REPOSITORY: 'attacker/curiofold' },
    { GITHUB_REF: 'refs/heads/development' },
    { GITHUB_EVENT_NAME: 'pull_request' },
    { GITHUB_WORKFLOW_REF: 'other.yml@refs/heads/main' },
    { GITHUB_SHA: commit },
    { GITHUB_RUN_ATTEMPT: '2' },
    { GITHUB_RUN_ID: '../approvals' },
  ]) {
    await assert.rejects(
      verifyProductionContentApproval({
        ...input,
        env: { ...env, ...override },
        fetcher: () => assert.fail('Unexpected network request'),
      }),
    )
  }
})
test('rejects malformed or mutable content targets', async () => {
  for (const override of [
    { commit: 'main' },
    { manifestPath: '../../secret' },
    { headSha: 'HEAD' },
  ]) {
    await assert.rejects(
      verifyProductionContentApproval({
        ...input,
        ...override,
        fetcher: () => assert.fail('Unexpected request'),
      }),
    )
  }
})
test('rejects old, rerun, foreign or wrong-head workflow records', async () => {
  for (const override of [
    { id: 1235 },
    { run_attempt: 2 },
    { event: 'push' },
    { head_branch: 'development' },
    { head_sha: commit },
    { path: '.github/workflows/ci.yml' },
    { repository: { full_name: 'other/repo' } },
    { head_repository: { full_name: 'attacker/curiofold' } },
    { status: 'completed' },
    { conclusion: 'success' },
  ])
    await assert.rejects(
      verifyProductionContentApproval({
        ...input,
        fetcher: fetcher({ ...run, ...override }),
      }),
    )
})
test('rejects missing, bypassed, bot, different-target or non-owner approvals', async () => {
  for (const reviews of [
    [],
    {},
    [{ ...approval, environments: [{ name: 'staging' }] }],
    [{ ...approval, state: 'rejected' }],
    [approval, { ...approval, state: 'rejected' }],
    [{ ...approval, user: { login: 'VascoFidanza', type: 'Bot' } }],
    [{ ...approval, user: { login: 'other', type: 'User' } }],
    [{ ...approval, comment: `release ${headSha} ${manifestPath}` }],
    [{ ...approval, comment: `release ${commit} content/releases/other.json` }],
  ])
    await assert.rejects(
      verifyProductionContentApproval({
        ...input,
        fetcher: fetcher(run, reviews),
      }),
    )
})
test('API failures, redirects and interrupted requests never authorize publication', async () => {
  for (const mocked of [
    async () => new Response('', { status: 403 }),
    async () => {
      throw new Error('network failure')
    },
    async () => new Response('invalid JSON'),
  ])
    await assert.rejects(
      verifyProductionContentApproval({ ...input, fetcher: mocked }),
    )
})
test('requires successful CI and CodeQL on the trusted execution SHA', async () => {
  for (const failingWorkflow of ['ci.yml', 'codeql.yml']) {
    for (const checks of [
      { workflow_runs: [] },
      { workflow_runs: [{ ...run, conclusion: 'failure' }] },
      {
        workflow_runs: [
          {
            ...run,
            head_sha: commit,
            conclusion: 'success',
            status: 'completed',
            event: 'push',
          },
        ],
      },
    ]) {
      const validFetcher = fetcher()
      await assert.rejects(
        verifyProductionContentApproval({
          ...input,
          fetcher: (url, options) =>
            url.includes(`/workflows/${failingWorkflow}/`)
              ? Promise.resolve(Response.json(checks))
              : validFetcher(url, options),
        }),
      )
    }
  }
})
const host = 'ep-reviewed-production.eu-central-1.aws.neon.tech'
const connection = `postgresql://curiofold_publisher:test@${host}/curiofold?sslmode=verify-full`
test('accepts only the configured dedicated publisher with verified TLS', () => {
  assert.doesNotThrow(() =>
    verifyProductionPublicationConnection(connection, host),
  )
  for (const candidate of [
    connection.replace(host, 'ep-development.eu-central-1.aws.neon.tech'),
    connection.replace('curiofold_publisher:', 'neondb_owner:'),
    connection.replace('verify-full', 'require'),
    `${connection}&options=-crole%3Dneondb_owner`,
    `${connection}&sslmode=disable`,
    connection.replace(':test@', '@'),
  ])
    assert.throws(() => verifyProductionPublicationConnection(candidate, host))
  assert.throws(() => verifyProductionPublicationConnection(connection, ''))
})
test('production refuses known fictional fixtures and reserved source domains, not ISBN/DOI-only sources', () => {
  assert.doesNotThrow(() =>
    assertSaleableProductionStory({
      storyKey: 'reviewed-story',
      sources: [{ url: null, isbn: '9781234567890' }],
    }),
  )
  assert.doesNotThrow(() =>
    assertSaleableProductionStory({
      storyKey: 'reviewed-story',
      sources: [{ url: 'https://www.nasa.gov/research/' }],
    }),
  )
  for (const storyKey of [
    'clockwork-gardens',
    'lantern-atlas',
    'release-rehearsal',
  ]) {
    assert.throws(() =>
      assertSaleableProductionStory({ storyKey, sources: [] }),
    )
  }
  for (const domain of [
    'test',
    'research.example.test',
    'example.com',
    'www.example.org',
    'localhost',
    'source.invalid',
  ]) {
    assert.throws(() =>
      assertSaleableProductionStory({
        storyKey: 'reviewed-story',
        sources: [{ url: `https://${domain}/` }],
      }),
    )
  }
})
test('workflow is manual, main-only, dormant and does not expose the DB to install steps', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/publish-content.yml', import.meta.url),
    'utf8',
  )
  assert.match(workflow, /workflow_dispatch:/u)
  assert.doesNotMatch(workflow, /^\s+(push|pull_request|schedule):/mu)
  assert.match(workflow, /github.ref == 'refs\/heads\/main'/u)
  assert.match(workflow, /environment: production-content/u)
  assert.match(workflow, /cancel-in-progress: false/u)
  assert.match(workflow, /persist-credentials: false/u)
  const [beforeRelease, release] = workflow.split(
    '      - name: Publish approved content',
  )
  assert.ok(release)
  assert.doesNotMatch(
    beforeRelease,
    /secrets\.CURIOFOLD_PRODUCTION_PUBLICATION_DATABASE_URL/u,
  )
  assert.match(
    release,
    /secrets\.CURIOFOLD_PRODUCTION_PUBLICATION_DATABASE_URL/u,
  )
  assert.doesNotMatch(workflow, /\$\{\{ inputs\./u)
})

test('production CLI refuses ordinary local execution without leaking a connection', () => {
  const result = spawnSync(
    'pnpm',
    ['exec', 'tsx', 'scripts/release-production-content.ts'],
    {
      cwd: new URL('..', import.meta.url),
      env: {
        ...process.env,
        GITHUB_ACTIONS: '',
        CURIOFOLD_PRODUCTION_PUBLICATION_DATABASE_URL:
          'postgresql://private-marker:private-marker@invalid/private-marker',
      },
      encoding: 'utf8',
      timeout: 15_000,
    },
  )
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Production publication failed/u)
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, /private-marker/u)
})
