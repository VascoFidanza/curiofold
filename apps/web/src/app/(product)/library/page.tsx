import Link from 'next/link'

import { ErrorState, PageFrame } from '@curiofold/ui'

import {
  IdentitySessionError,
  isClerkSessionConfigured,
  requireAuthorizationContext,
} from '@/server/identity'
import { getLibraryStories } from '@/server/library'

import styles from './library.module.css'

export const dynamic = 'force-dynamic'

type LibraryAccess =
  | Readonly<{ status: 'authenticated'; userId: string }>
  | Readonly<{ status: 'account_disabled' | 'unauthenticated' }>

async function resolveLibraryAccess(): Promise<LibraryAccess> {
  try {
    const context = await requireAuthorizationContext()
    return { status: 'authenticated', userId: context.userId }
  } catch (error: unknown) {
    if (
      error instanceof IdentitySessionError &&
      (error.code === 'account_disabled' || error.code === 'unauthenticated')
    ) {
      return { status: error.code }
    }
    throw error
  }
}

function stateLabel(state: 'completed' | 'in_progress' | 'unread'): string {
  switch (state) {
    case 'completed':
      return 'Completed'
    case 'in_progress':
      return 'In progress'
    case 'unread':
      return 'Unread'
  }
}

function authenticatedUserId(access: LibraryAccess): string {
  if (access.status === 'authenticated') return access.userId
  throw new Error('Library data was requested without an authenticated user.')
}

export default async function LibraryPage() {
  if (!isClerkSessionConfigured()) {
    return (
      <PageFrame>
        <ErrorState
          description="This environment has no identity provider connected. Your Library will be available once a session can be verified."
          eyebrow="Library unavailable"
          title="Your reading shelf is not configured here."
        />
      </PageFrame>
    )
  }

  const access = await resolveLibraryAccess()
  if (access.status === 'unauthenticated') {
    return (
      <PageFrame>
        <section className={styles.layout}>
          <p className={styles.eyebrow}>Your Library</p>
          <h1>Keep every Story you unlock.</h1>
          <p className={styles.lede}>
            Sign in to see what you own, continue where you left off, and return
            to completed Stories.
          </p>
          <Link
            className={styles.signInLink}
            href="/sign-in?redirect_url=%2Flibrary"
          >
            Sign in to your Library
          </Link>
        </section>
      </PageFrame>
    )
  }

  if (access.status === 'account_disabled') {
    return (
      <PageFrame>
        <ErrorState
          description="This account cannot access protected Curiofold data. Contact support if you believe this is a mistake."
          eyebrow="Library unavailable"
          title="Account access is disabled."
        />
      </PageFrame>
    )
  }

  const library = await getLibraryStories(authenticatedUserId(access), 'en')
  if (library.status === 'unavailable') {
    return (
      <PageFrame>
        <ErrorState
          description="Your owned Stories could not be loaded right now. Please try again shortly."
          eyebrow="Library temporarily unavailable"
          title="We could not load your reading shelf."
        />
      </PageFrame>
    )
  }

  return (
    <PageFrame>
      <section className={styles.layout}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Your Library</p>
          <h1>Stories you own</h1>
          <p className={styles.lede}>
            Return to a rabbit hole, pick up where you paused, or revisit a
            finished Story.
          </p>
        </header>

        {library.stories.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>Your shelf is ready when you are.</h2>
            <p>
              Stories you unlock will live here, along with your reading
              progress.
            </p>
            <Link href="/">Discover Stories</Link>
          </div>
        ) : (
          <div className={styles.storyGrid}>
            {library.stories.map((story) => (
              <article className={styles.storyCard} key={story.storyId}>
                <p className={styles.state}>{stateLabel(story.state)}</p>
                <h2>{story.title}</h2>
                <p>{story.hook}</p>
                {story.state === 'in_progress' ? (
                  <p className={styles.progress}>
                    {story.highWaterPercent}% read
                  </p>
                ) : null}
                <Link href={`/${story.locale}/stories/${story.slug}/read`}>
                  {story.state === 'in_progress'
                    ? 'Continue reading'
                    : story.state === 'completed'
                      ? 'Read again'
                      : 'Start reading'}{' '}
                  <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </PageFrame>
  )
}
