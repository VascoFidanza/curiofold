import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const outputDirectory = join(process.cwd(), 'apps/web/.next/static')
const secretMarkers = [
  'CLERK_SECRET_KEY',
  'DATABASE_URL',
  'SENTRY_AUTH_TOKEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
]

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? filesIn(path) : [path]
  })
}

if (!existsSync(outputDirectory)) {
  throw new Error(
    `Expected a Next.js client output directory at ${outputDirectory}`,
  )
}

const leakedMarkers = filesIn(outputDirectory).flatMap((path) => {
  const source = readFileSync(path, 'utf8')
  return secretMarkers
    .filter((marker) => source.includes(marker))
    .map((marker) => ({ marker, path }))
})

if (leakedMarkers.length > 0) {
  const details = leakedMarkers
    .map(({ marker, path }) => `${marker} in ${path}`)
    .join('\n')
  throw new Error(
    `Server-only environment markers found in client output:\n${details}`,
  )
}

console.log(
  `Client bundle scan passed (${filesIn(outputDirectory).length} files checked).`,
)
