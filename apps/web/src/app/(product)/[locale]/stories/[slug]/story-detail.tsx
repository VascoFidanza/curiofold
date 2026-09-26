import Link from 'next/link'

import { PageFrame } from '@curiofold/ui'
import type {
  PublicStoryDetail,
  PublicStoryPreviewBlock,
} from '@curiofold/content'
import type { PublishedStoryLocalization } from '@curiofold/db'
import type { StoryPurchaseState } from '@/server/story-purchase-state'

import styles from './story-detail.module.css'
import { UnlockAction } from './unlock-action'

function humanizeKey(value: string): string {
  return value
    .split('-')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    new Date(value),
  )
}

function localeLabel(locale: string): string {
  try {
    return (
      new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale
    )
  } catch {
    return locale
  }
}

function PreviewBlock({ block }: Readonly<{ block: PublicStoryPreviewBlock }>) {
  switch (block.kind) {
    case 'paragraph':
      return <p className={styles.previewParagraph}>{block.text}</p>
    case 'section_heading':
      return block.level === 2 ? (
        <h3 className={styles.previewHeading}>{block.text}</h3>
      ) : (
        <h4 className={styles.previewHeading}>{block.text}</h4>
      )
    case 'pull_quote':
      return (
        <figure className={styles.previewQuote}>
          <blockquote>{block.text}</blockquote>
          {block.attribution ? (
            <figcaption>{block.attribution}</figcaption>
          ) : null}
        </figure>
      )
    case 'fact_box':
      return (
        <aside className={styles.previewFact}>
          <h3>{block.title}</h3>
          <p>{block.body}</p>
        </aside>
      )
    case 'image':
      return (
        <figure className={styles.previewMedia}>
          <div className={styles.previewMediaPlaceholder}>
            {block.alt ? (
              <p>{block.alt}</p>
            ) : (
              <span aria-hidden="true">Decorative illustration</span>
            )}
          </div>
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      )
    case 'source_note':
      return <p className={styles.previewNote}>{block.text}</p>
    case 'end_matter':
      return (
        <section className={styles.previewEndMatter}>
          <h3>{block.title}</h3>
          <p>{block.text}</p>
        </section>
      )
  }
}

export function StoryDetail({
  detail,
  purchase,
  storyId,
}: Readonly<{
  detail: PublicStoryDetail
  purchase: StoryPurchaseState
  storyId: string
}>) {
  const detailPath = `/${detail.locale}/stories/${detail.slug}`
  const creditsPath = `/credits?return=${encodeURIComponent(detailPath)}`
  const sourceLabel = `${String(detail.credibility.sourceCount)} ${
    detail.credibility.sourceCount === 1 ? 'source' : 'sources'
  } recorded`

  return (
    <PageFrame>
      <article className={styles.layout}>
        <div className={styles.story}>
          <div className={styles.categories}>
            {detail.categoryKeys.map((category) => (
              <span key={category}>{humanizeKey(category)}</span>
            ))}
          </div>
          <h1 className={styles.title}>{detail.title}</h1>
          <p className={styles.hook}>{detail.hook}</p>
          <ul aria-label="Story information" className={styles.metadata}>
            <li>{detail.readingMinutes} min</li>
            <li>1 credit</li>
            <li>{sourceLabel}</li>
          </ul>
          <p className={styles.deck}>{detail.deck}</p>

          <section
            aria-labelledby="credibility-heading"
            className={styles.credibility}
          >
            <p className={styles.sectionEyebrow}>
              How this Story was researched
            </p>
            <h2 id="credibility-heading">
              Sources are recorded and the Story was editorially reviewed.
            </h2>
            <p>
              Reviewed{' '}
              <time dateTime={detail.credibility.reviewedAt}>
                {formatDate(detail.credibility.reviewedAt, detail.locale)}
              </time>
              .
            </p>
            {detail.updateNote ? (
              <p>
                Updated{' '}
                <time dateTime={detail.publishedAt}>
                  {formatDate(detail.publishedAt, detail.locale)}
                </time>
                : {detail.updateNote}
              </p>
            ) : null}
          </section>

          <section
            aria-labelledby="about-story-heading"
            className={styles.about}
          >
            <p className={styles.sectionEyebrow}>About this Story</p>
            <h2 id="about-story-heading">A short way into the rabbit hole</h2>
            <p>{detail.preview}</p>
          </section>

          {detail.previewBlocks.length > 0 ? (
            <section
              aria-labelledby="preview-heading"
              className={styles.preview}
            >
              <p className={styles.sectionEyebrow}>Preview</p>
              <h2 id="preview-heading">Start reading</h2>
              <div className={styles.previewBody}>
                {detail.previewBlocks.map((block) => (
                  <PreviewBlock block={block} key={block.id} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside aria-labelledby="unlock-heading" className={styles.unlock}>
          <p className={styles.unlockCost}>
            {purchase.status === 'owned' ? 'In your Library' : '1 credit'}
          </p>
          <h2 id="unlock-heading">
            {purchase.status === 'owned'
              ? 'This Story is yours'
              : 'Keep this Story in your Library'}
          </h2>
          {purchase.status === 'owned' ? (
            <>
              <p>
                {purchase.readingState === 'completed'
                  ? 'You completed this Story.'
                  : purchase.readingState === 'in_progress'
                    ? 'Pick up where you left off.'
                    : 'Ready whenever you are.'}
              </p>
              <Link className={styles.unlockLink} href={`${detailPath}/read`}>
                {purchase.readingState === 'completed'
                  ? 'Read again'
                  : purchase.readingState === 'in_progress'
                    ? 'Continue reading'
                    : 'Start reading'}
              </Link>
            </>
          ) : purchase.status === 'anonymous' ? (
            <>
              <p>Sign in to see your balance and unlock this Story.</p>
              <Link
                className={styles.unlockLink}
                href={`/sign-in?redirect_url=${encodeURIComponent(detailPath)}`}
              >
                Sign in to unlock
              </Link>
            </>
          ) : purchase.status === 'unowned' ? (
            <>
              <p>
                You have {purchase.availableCredits}{' '}
                {purchase.availableCredits === 1 ? 'credit' : 'credits'}{' '}
                available.
              </p>
              {!purchase.canUnlock ? (
                <p>
                  Verify your email in <Link href="/account">Account</Link>{' '}
                  before unlocking.
                </p>
              ) : purchase.availableCredits < 1 ? (
                <Link className={styles.unlockLink} href={creditsPath}>
                  Add credits to continue
                </Link>
              ) : (
                <UnlockAction detailPath={detailPath} storyId={storyId} />
              )}
              <p className={styles.unlockNote}>
                Yours permanently in your Library.
              </p>
            </>
          ) : (
            <p>
              {purchase.status === 'disabled'
                ? 'This account cannot unlock Stories. Contact support if you believe this is a mistake.'
                : 'Ownership is temporarily unavailable. Please try again shortly.'}
            </p>
          )}
        </aside>
      </article>
    </PageFrame>
  )
}

export function MissingStoryLocale({
  availableLocalizations,
  requestedLocale,
}: Readonly<{
  availableLocalizations: readonly PublishedStoryLocalization[]
  requestedLocale: string
}>) {
  return (
    <PageFrame>
      <section className={styles.unavailable}>
        <p className={styles.sectionEyebrow}>Language unavailable</p>
        <h1>This Story is not available in {requestedLocale} yet.</h1>
        <p>
          Choose an available language. Curiofold will never silently replace a
          Story with a different translation.
        </p>
        <ul>
          {availableLocalizations.map(({ locale, slug }) => (
            <li key={locale}>
              <Link href={`/${locale}/stories/${slug}`}>
                Read in {localeLabel(locale)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageFrame>
  )
}
