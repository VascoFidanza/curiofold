import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

import { compileStoryDocument } from './story-contract'

const repositoryRoot = resolve(import.meta.dirname, '../../..')
const storyDirectory = resolve(repositoryRoot, 'content/stories')

async function collectJsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name)

      if (entry.isDirectory()) {
        return collectJsonFiles(path)
      }

      return entry.isFile() && entry.name.endsWith('.json') ? [path] : []
    }),
  )

  return nested.flat().sort()
}

async function main(): Promise<void> {
  const files = await collectJsonFiles(storyDirectory)

  if (files.length === 0) {
    throw new Error(`No Story documents found in ${storyDirectory}.`)
  }

  const compiled = await Promise.all(
    files.map(async (file) => {
      const input: unknown = JSON.parse(await readFile(file, 'utf8'))
      return { compiled: compileStoryDocument(input), file }
    }),
  )

  const identities = new Map<string, string>()
  const slugs = new Map<string, string>()

  for (const { compiled: story, file } of compiled) {
    const { document } = story
    const identity = `${document.storyKey}:${document.locale}:${String(document.revision)}`
    const slug = `${document.locale}:${document.slug}`

    const existingIdentityFile = identities.get(identity)
    if (existingIdentityFile !== undefined) {
      throw new Error(
        `Duplicate Story identity ${identity} in ${existingIdentityFile} and ${file}.`,
      )
    }

    const existingStoryKey = slugs.get(slug)
    if (
      existingStoryKey !== undefined &&
      existingStoryKey !== document.storyKey
    ) {
      throw new Error(
        `Slug ${slug} belongs to both ${existingStoryKey} and ${document.storyKey}.`,
      )
    }

    identities.set(identity, file)
    slugs.set(slug, document.storyKey)
  }

  for (const { compiled: story, file } of compiled) {
    const { document } = story
    if (document.previousRevision === null) {
      continue
    }

    const predecessor = `${document.storyKey}:${document.locale}:${String(document.previousRevision)}`
    if (!identities.has(predecessor)) {
      throw new Error(
        `${file} references missing predecessor revision ${predecessor}.`,
      )
    }
  }

  process.stdout.write(
    `Validated ${String(compiled.length)} Story documents across ${String(new Set(compiled.map(({ compiled: story }) => story.document.storyKey)).size)} stable Stories.\n`,
  )
}

await main()
