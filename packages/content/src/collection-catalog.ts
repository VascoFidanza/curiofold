export interface CollectionDefinition {
  readonly key: string
  readonly locale: string
  readonly title: string
  readonly description: string
  readonly storyOrder: readonly string[]
}

// Editorially reviewed metadata. Add launch Collections here alongside Story PRs.
const collections: readonly CollectionDefinition[] = [
  {
    key: 'synthetic-fixtures',
    locale: 'en',
    title: 'Sample Stories',
    description:
      'Synthetic Stories for testing the Curiofold reading experience.',
    storyOrder: ['clockwork-gardens', 'lantern-atlas'],
  },
  {
    key: 'synthetic-fixtures',
    locale: 'pt-PT',
    title: 'Histórias de demonstração',
    description:
      'Histórias fictícias para testar a experiência de leitura Curiofold.',
    storyOrder: ['clockwork-gardens', 'lantern-atlas'],
  },
]

export function listCollectionDefinitions(
  locale: string,
): readonly CollectionDefinition[] {
  return collections.filter((item) => item.locale === locale)
}

export function findCollectionDefinition(
  locale: string,
  key: string,
): CollectionDefinition | undefined {
  return collections.find((item) => item.locale === locale && item.key === key)
}
