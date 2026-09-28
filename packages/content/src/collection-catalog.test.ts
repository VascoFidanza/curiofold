import { describe, expect, it } from 'vitest'

import {
  findCollectionDefinition,
  listCollectionDefinitions,
} from './collection-catalog'

describe('editorial Collection catalogue', () => {
  it('has explicit locale-specific definitions and ordering', () => {
    expect(findCollectionDefinition('en', 'synthetic-fixtures')).toMatchObject({
      title: 'Sample Stories',
      storyOrder: ['clockwork-gardens', 'lantern-atlas'],
    })
    expect(findCollectionDefinition('pt-PT', 'synthetic-fixtures')?.title).toBe(
      'Histórias de demonstração',
    )
  })

  it('does not invent metadata for unknown keys or locales', () => {
    expect(findCollectionDefinition('en', 'unknown')).toBeUndefined()
    expect(listCollectionDefinitions('fr')).toEqual([])
  })
})
