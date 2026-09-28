import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getCollectionReaderState } from './collection-reader-state'
import { IdentitySessionError } from './identity'

const dependencies = vi.hoisted(() => ({
  configured: vi.fn(),
  context: vi.fn(),
  library: vi.fn(),
  log: vi.fn(),
}))

vi.mock('./identity', () => ({
  IdentitySessionError: class IdentitySessionError extends Error {
    constructor(readonly code: string) {
      super(code)
    }
  },
  isClerkSessionConfigured: dependencies.configured,
  requireAuthorizationContext: dependencies.context,
}))
vi.mock('./library', () => ({ getLibraryStories: dependencies.library }))
vi.mock('./observability', () => ({
  runtimeLogger: { error: dependencies.log },
}))

beforeEach(() => {
  vi.clearAllMocks()
  dependencies.configured.mockReturnValue(true)
})

describe('optional Collection reading state', () => {
  it('keeps anonymous browsing independent of the Library', async () => {
    dependencies.context.mockRejectedValue(
      new IdentitySessionError('unauthenticated'),
    )
    await expect(getCollectionReaderState('en')).resolves.toEqual({
      status: 'anonymous',
    })
    expect(dependencies.library).not.toHaveBeenCalled()
  })

  it('serves public Collections when no Clerk provider is configured', async () => {
    dependencies.configured.mockReturnValue(false)
    await expect(getCollectionReaderState('en')).resolves.toEqual({
      status: 'anonymous',
    })
    expect(dependencies.context).not.toHaveBeenCalled()
  })

  it('uses the authenticated user and requested locale only', async () => {
    dependencies.context.mockResolvedValue({ userId: 'reader-1' })
    dependencies.library.mockResolvedValue({ status: 'available', stories: [] })
    await expect(getCollectionReaderState('pt-PT')).resolves.toEqual({
      status: 'available',
      stories: [],
    })
    expect(dependencies.library).toHaveBeenCalledWith('reader-1', 'pt-PT')
  })

  it('does not present an unavailable Library as zero progress', async () => {
    dependencies.context.mockResolvedValue({ userId: 'reader-1' })
    dependencies.library.mockResolvedValue({ status: 'unavailable' })
    await expect(getCollectionReaderState('en')).resolves.toEqual({
      status: 'unavailable',
    })
  })
})
