/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-is-framework-independent',
      comment:
        'The domain package may not depend on delivery, persistence, UI, or provider code.',
      severity: 'error',
      from: { path: '^packages/domain/' },
      to: { path: '^(apps/|packages/(config|content|db|ui)/)' },
    },
    {
      name: 'packages-do-not-depend-on-apps',
      comment:
        'Applications compose packages; packages never import applications.',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'data-layer-does-not-depend-on-ui',
      comment: 'Persistence code remains independent from presentation code.',
      severity: 'error',
      from: { path: '^packages/db/' },
      to: { path: '^packages/ui/' },
    },
    {
      name: 'no-circular-dependencies',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)node_modules/|(^|/)\.next/' },
    tsConfig: { fileName: 'tsconfig.base.json' },
  },
}
