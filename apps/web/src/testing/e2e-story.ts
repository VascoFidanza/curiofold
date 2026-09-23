import {
  compileStoryDocument,
  createPublicStoryDetail,
  createReaderStory,
} from '@curiofold/content'

import storyDocument from '../../../../content/stories/clockwork-gardens/en/2.json'

const compiledStory = compileStoryDocument(storyDocument)

export const e2ePublicStory = createPublicStoryDetail(compiledStory)
export const e2eReaderStory = createReaderStory(compiledStory)

export const e2eProgress = {
  completedAt: null,
  highWaterPercent: 0,
  lastClientSequence: 0,
  resumeBlockId: null,
  resumeOffset: 0,
  storyId: '11111111-1111-4111-8111-111111111111',
  versionId: '22222222-2222-4222-8222-222222222222',
} as const

export function assertE2eFixturesEnabled(): void {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.CURIOFOLD_E2E_FIXTURES !== '1'
  ) {
    throw new Error(
      'E2E fixture routes are unavailable outside test development.',
    )
  }
}
