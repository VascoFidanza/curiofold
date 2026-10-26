const repository = 'VascoFidanza/curiofold'
const workflowPath = '.github/workflows/publish-content.yml'
const environmentName = 'production-content'
const shaPattern = /^[a-f0-9]{40}$/u
const manifestPattern = /^content\/releases\/[a-z0-9-]+\.json$/u

function requireCondition(condition) {
  if (!condition)
    throw new Error('Production content approval is missing or invalid.')
}

/** Fail closed even if an environment reviewer rule was removed or bypassed. */
export async function verifyProductionContentApproval({
  env,
  commit,
  manifestPath,
  headSha,
  fetcher = fetch,
}) {
  requireCondition(
    shaPattern.test(commit ?? '') &&
      manifestPattern.test(manifestPath ?? '') &&
      shaPattern.test(headSha ?? '') &&
      env.CURIOFOLD_PRODUCTION_PUBLICATION_ENABLED === 'true' &&
      env.GITHUB_ACTIONS === 'true' &&
      env.GITHUB_REPOSITORY === repository &&
      env.GITHUB_REF === 'refs/heads/main' &&
      env.GITHUB_EVENT_NAME === 'workflow_dispatch' &&
      env.GITHUB_WORKFLOW_REF ===
        `${repository}/${workflowPath}@refs/heads/main` &&
      env.GITHUB_SHA === headSha &&
      env.GITHUB_RUN_ATTEMPT === '1' &&
      /^[1-9][0-9]*$/u.test(env.GITHUB_RUN_ID ?? '') &&
      Boolean(env.GITHUB_TOKEN),
  )
  const request = async (path) => {
    const response = await fetcher(
      `https://api.github.com/repos/${repository}/actions/${path}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          'X-GitHub-Api-Version': '2026-03-10',
        },
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
      },
    )
    requireCondition(response.ok)
    return response.json()
  }
  const run = await request(`runs/${env.GITHUB_RUN_ID}`)
  requireCondition(
    String(run.id) === env.GITHUB_RUN_ID &&
      run.run_attempt === 1 &&
      run.event === 'workflow_dispatch' &&
      run.head_branch === 'main' &&
      run.head_sha === headSha &&
      run.path === workflowPath &&
      run.repository?.full_name === repository &&
      run.head_repository?.full_name === repository &&
      run.status === 'in_progress' &&
      run.conclusion === null,
  )
  const reviews = await request(`runs/${env.GITHUB_RUN_ID}/approvals`)
  requireCondition(Array.isArray(reviews))
  const relevant = reviews.filter((review) =>
    review.environments?.some((item) => item.name === environmentName),
  )
  // Require an explicit owner review of this exact immutable operation. Never
  // infer approval from a boolean, a workflow actor, or an old successful run.
  const approvalComment = `release ${commit} ${manifestPath}`
  requireCondition(
    !relevant.some((review) => review.state === 'rejected') &&
      relevant.some(
        (review) =>
          review.state === 'approved' &&
          review.user?.type === 'User' &&
          review.user.login === 'VascoFidanza' &&
          review.comment === approvalComment,
      ),
  )
  for (const workflow of ['ci.yml', 'codeql.yml']) {
    const checks = await request(
      `workflows/${workflow}/runs?head_sha=${headSha}&branch=main&event=push&status=completed&per_page=5`,
    )
    requireCondition(
      Array.isArray(checks.workflow_runs) &&
        checks.workflow_runs.some(
          (check) =>
            check.head_sha === headSha &&
            check.head_branch === 'main' &&
            check.event === 'push' &&
            check.status === 'completed' &&
            check.conclusion === 'success' &&
            check.repository?.full_name === repository,
        ),
    )
  }
  return { operator: 'github:VascoFidanza', runId: env.GITHUB_RUN_ID }
}

/** A production publisher must not accidentally target a development database. */
export function verifyProductionPublicationConnection(connectionString, host) {
  requireCondition(
    typeof host === 'string' &&
      /^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/u.test(host),
  )
  const url = new URL(connectionString)
  requireCondition(
    ['postgres:', 'postgresql:'].includes(url.protocol) &&
      url.hostname === host &&
      decodeURIComponent(url.username) === 'curiofold_publisher' &&
      Boolean(url.password) &&
      url.searchParams.get('sslmode') === 'verify-full' &&
      url.searchParams.size === 1,
  )
}

export function assertSaleableProductionStory(document) {
  requireCondition(
    !['clockwork-gardens', 'lantern-atlas', 'release-rehearsal'].includes(
      document.storyKey,
    ) &&
      !document.sources.some(
        (source) =>
          source.url &&
          /(^|\.)(test|invalid|localhost|example|example\.com|example\.org|example\.net)$/iu.test(
            new URL(source.url).hostname,
          ),
      ),
  )
}
