import { execFileSync } from 'node:child_process'

import {
  compileStoryDocument,
  publicationManifestSchema,
} from '@curiofold/content'

/** Always read immutable Git objects, never a mutable checkout's content files. */
export function readContentRelease(commit: string, manifestPath: string) {
  if (
    !/^[a-f0-9]{40,64}$/iu.test(commit) ||
    !/^content\/releases\/[a-z0-9-]+\.json$/u.test(manifestPath)
  ) {
    throw new Error(
      'A full source SHA and content release manifest are required.',
    )
  }
  const read = (path: string): unknown =>
    JSON.parse(
      execFileSync('git', ['show', `${commit}:${path}`], {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      }),
    ) as unknown
  const manifest = publicationManifestSchema.parse(read(manifestPath))
  const document = read(manifest.storyPath)
  const compiled = compileStoryDocument(document)
  const [, , storyKey, locale] = manifest.storyPath.split('/')
  if (
    compiled.document.storyKey !== storyKey ||
    compiled.document.locale !== locale
  ) {
    throw new Error('Story path and document identity disagree.')
  }
  return { manifest, document, compiled }
}
