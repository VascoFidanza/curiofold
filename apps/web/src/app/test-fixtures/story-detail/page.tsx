import { notFound } from 'next/navigation'

import { ApplicationShell } from '../../(product)/application-shell'
import { StoryDetail } from '../../(product)/[locale]/stories/[slug]/story-detail'
import {
  assertE2eFixturesEnabled,
  e2ePublicStory,
} from '../../../testing/e2e-story'

export default function StoryDetailFixturePage() {
  try {
    assertE2eFixturesEnabled()
  } catch {
    notFound()
  }

  return (
    <ApplicationShell activeNavigation="discover">
      <StoryDetail
        detail={e2ePublicStory}
        purchase={{ status: 'anonymous' }}
        storyId="00000000-0000-4000-8000-000000000001"
      />
    </ApplicationShell>
  )
}
