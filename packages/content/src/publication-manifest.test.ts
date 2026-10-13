import { describe, expect, it } from 'vitest'
import { publicationManifestSchema } from './publication-manifest'

const manifest = {
  schemaVersion: 'content-release/v1',
  action: 'publish',
  storyPath: 'content/stories/clockwork-gardens/en/001-published.json',
  expectedCurrent: null,
  operator: 'Human reviewer',
  reason: 'Reviewed initial release.',
}

describe('publication manifest', () => {
  it('accepts explicit initial publish and reviewed rollback/archive targets', () => {
    expect(publicationManifestSchema.parse(manifest)).toEqual(manifest)
    expect(
      publicationManifestSchema.parse({
        ...manifest,
        action: 'archive',
        expectedCurrent: { revision: 2, state: 'published' },
      }).action,
    ).toBe('archive')
  })
  it.each([
    { storyPath: '../../secrets.json' },
    { storyPath: 'content/stories/../en/001.json' },
    { operator: '' },
    { reason: '' },
    { action: 'withdraw' },
    { expectedCurrent: { revision: 0, state: 'published' } },
    { extra: true },
  ])('rejects invalid or implicit operator inputs: %j', (override) => {
    expect(
      publicationManifestSchema.safeParse({ ...manifest, ...override }).success,
    ).toBe(false)
  })
})
