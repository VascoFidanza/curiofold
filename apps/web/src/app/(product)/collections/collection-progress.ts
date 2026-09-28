import type { PublicCollection } from '@/server/public-collections'
import type { CollectionReaderState } from '@/server/collection-reader-state'

export function summarizeCollectionReading(
  collection: PublicCollection,
  reader: CollectionReaderState,
) {
  if (reader.status !== 'available') return null

  const collectionSlugs = new Set(collection.stories.map((story) => story.slug))
  const ownedStories = reader.stories.filter(
    (story) =>
      story.locale === collection.locale && collectionSlugs.has(story.slug),
  )
  return {
    completedCount: ownedStories.filter((story) => story.state === 'completed')
      .length,
    ownedCount: ownedStories.length,
    stateBySlug: new Map(
      ownedStories.map((story) => [story.slug, story.state]),
    ),
  }
}
