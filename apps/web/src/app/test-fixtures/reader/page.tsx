import { notFound } from 'next/navigation'

import { StoryReader } from '../../(reader)/[locale]/stories/[slug]/read/story-reader'
import {
  assertE2eFixturesEnabled,
  e2eProgress,
  e2eReaderStory,
} from '../../../testing/e2e-story'

export default function ReaderFixturePage() {
  try {
    assertE2eFixturesEnabled()
  } catch {
    notFound()
  }

  return (
    <StoryReader
      progress={e2eProgress}
      story={e2eReaderStory}
      storyId={e2eProgress.storyId}
      versionId={e2eProgress.versionId}
    />
  )
}
