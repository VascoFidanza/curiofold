import type {
  ReaderStory,
  ReaderStoryBlock,
  ReaderStorySource,
} from '@curiofold/content'

import { ReaderFrame } from './reader-frame'
import styles from './reader.module.css'

function humanizeKey(value: string): string {
  return value
    .split('-')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function CitationLinks({
  sourceIds,
  sourceNumbers,
  sources,
}: Readonly<{
  sourceIds: readonly string[]
  sourceNumbers: ReadonlyMap<string, number>
  sources: ReadonlyMap<string, ReaderStorySource>
}>) {
  if (sourceIds.length === 0) {
    return null
  }

  return (
    <sup aria-label="Sources" className={styles.citations}>
      {sourceIds.map((sourceId, index) => {
        const number = sourceNumbers.get(sourceId)
        const source = sources.get(sourceId)
        if (!number || !source) {
          return null
        }

        return (
          <span key={sourceId}>
            {index > 0 ? ', ' : null}
            <a
              aria-label={`Source ${String(number)}: ${source.title}`}
              href={`#source-${sourceId}`}
            >
              {number}
            </a>
          </span>
        )
      })}
    </sup>
  )
}

function StoryBlock({
  block,
  sourceNumbers,
  sources,
}: Readonly<{
  block: ReaderStoryBlock
  sourceNumbers: ReadonlyMap<string, number>
  sources: ReadonlyMap<string, ReaderStorySource>
}>) {
  const blockProps = {
    'data-reading-units': block.readingUnits,
    id: `block-${block.id}`,
  }
  const citations =
    'sourceIds' in block ? (
      <CitationLinks
        sourceIds={block.sourceIds}
        sourceNumbers={sourceNumbers}
        sources={sources}
      />
    ) : null

  switch (block.kind) {
    case 'paragraph':
      return (
        <p className={styles.paragraph} {...blockProps}>
          {block.text} {citations}
        </p>
      )
    case 'section_heading':
      return block.level === 2 ? (
        <h2 className={styles.sectionHeading} {...blockProps}>
          {block.text}
        </h2>
      ) : (
        <h3 className={styles.sectionHeading} {...blockProps}>
          {block.text}
        </h3>
      )
    case 'pull_quote':
      return (
        <figure className={styles.pullQuote} {...blockProps}>
          <blockquote>{block.text}</blockquote>
          <figcaption>
            {block.attribution ? <span>{block.attribution}</span> : null}
            {citations}
          </figcaption>
        </figure>
      )
    case 'fact_box':
      return (
        <aside className={styles.factBox} {...blockProps}>
          <h2>{block.title}</h2>
          <p>
            {block.body} {citations}
          </p>
        </aside>
      )
    case 'image':
      return (
        <figure className={styles.mediaBlock} {...blockProps}>
          <div
            aria-hidden={block.decorative || undefined}
            aria-label={block.decorative ? undefined : (block.alt ?? undefined)}
            className={styles.mediaPlaceholder}
            role={block.decorative ? undefined : 'img'}
          >
            <span aria-hidden="true">Editorial visual</span>
          </div>
          <figcaption>
            {block.caption ? <span>{block.caption}</span> : null}
            <small>{block.attribution}</small>
            {citations}
          </figcaption>
        </figure>
      )
    case 'source_note':
      return (
        <aside className={styles.sourceNote} {...blockProps}>
          <p>
            {block.text} {citations}
          </p>
        </aside>
      )
    case 'end_matter':
      return (
        <section className={styles.endMatter} {...blockProps}>
          <h2>{block.title}</h2>
          <p>{block.text}</p>
          {block.links.length > 0 ? (
            <ul>
              {block.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      )
  }
}

function SourceEntry({
  locale,
  number,
  source,
}: Readonly<{
  locale: string
  number: number
  source: ReaderStorySource
}>) {
  return (
    <li id={`source-${source.id}`}>
      <p>
        <span className={styles.sourceNumber}>{number}.</span>{' '}
        {source.authors.length > 0 ? `${source.authors.join(', ')}. ` : null}
        <cite>{source.title}</cite>
        {source.publisher ? `. ${source.publisher}` : null}
        {source.publishedAt
          ? `. ${formatDate(source.publishedAt, locale)}`
          : null}
        .
      </p>
      <p className={styles.sourceLinks}>
        {source.url ? (
          <a href={source.url} rel="noreferrer" target="_blank">
            Visit source
          </a>
        ) : null}
        {source.doi ? (
          <a
            href={`https://doi.org/${encodeURIComponent(source.doi)}`}
            rel="noreferrer"
            target="_blank"
          >
            DOI {source.doi}
          </a>
        ) : null}
        {source.isbn ? <span>ISBN {source.isbn}</span> : null}
        {source.accessedAt ? (
          <span>Accessed {formatDate(source.accessedAt, locale)}</span>
        ) : null}
      </p>
    </li>
  )
}

export function StoryReader({ story }: Readonly<{ story: ReaderStory }>) {
  const sourceNumbers = new Map(
    story.sources.map((source, index) => [source.id, index + 1] as const),
  )
  const sources = new Map(
    story.sources.map((source) => [source.id, source] as const),
  )

  return (
    <ReaderFrame
      detailHref={`/${story.locale}/stories/${story.slug}`}
      title={story.title}
    >
      <main id="story-content">
        <article className={styles.story} lang={story.locale}>
          <header className={styles.storyHeader}>
            <p className={styles.category}>
              {story.categoryKeys.map(humanizeKey).join(' · ')}
            </p>
            <h1>{story.title}</h1>
            <p className={styles.deck}>{story.deck}</p>
            <ul aria-label="Story information" className={styles.metadata}>
              <li>{story.readingMinutes} min read</li>
              <li>Revision {story.revision}</li>
              <li>
                Published{' '}
                <time dateTime={story.publishedAt}>
                  {formatDate(story.publishedAt, story.locale)}
                </time>
              </li>
            </ul>
            {story.updateNote ? (
              <p className={styles.updateNote}>{story.updateNote}</p>
            ) : null}
          </header>

          <div className={styles.storyBody}>
            {story.blocks.map((block) => (
              <StoryBlock
                block={block}
                key={block.id}
                sourceNumbers={sourceNumbers}
                sources={sources}
              />
            ))}
          </div>

          <section aria-labelledby="sources-heading" className={styles.sources}>
            <p className={styles.sectionEyebrow}>Research trail</p>
            <h2 id="sources-heading">Sources &amp; notes</h2>
            <p>{story.methodologyNote}</p>
            <ol>
              {story.sources.map((source, index) => (
                <SourceEntry
                  key={source.id}
                  locale={story.locale}
                  number={index + 1}
                  source={source}
                />
              ))}
            </ol>
          </section>
        </article>
      </main>
    </ReaderFrame>
  )
}
