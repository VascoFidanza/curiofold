import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const outputDirectory = join(process.cwd(), 'apps/web/.next/static')
const webSourceDirectory = join(process.cwd(), 'apps/web/src')
// Clerk's published client SDK contains the literal configuration key name.
// Its actual value is covered below, while first-party references are restricted
// to server-owned modules.
const secretMarkers = [
  'CLERK_WEBHOOK_SIGNING_SECRET',
  'DATABASE_URL',
  'SENTRY_AUTH_TOKEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
]
const serverEnvironmentNames = ['CLERK_SECRET_KEY', ...secretMarkers]

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

const configuredSecretValues = serverEnvironmentNames.flatMap((name) => {
  const value = process.env[name]
  return value && value.length >= 8 ? [{ name, value }] : []
})

const leakedValues = filesIn(outputDirectory).flatMap((path) => {
  const source = readFileSync(path, 'utf8')
  return configuredSecretValues
    .filter(({ value }) => source.includes(value))
    .map(({ name }) => ({ marker: `${name} value`, path }))
})

const unsafeSourceReferences = filesIn(webSourceDirectory).flatMap((path) => {
  const normalized = path.replaceAll('\\', '/')
  const isServerOwned =
    normalized.includes('/src/server/') || normalized.endsWith('/src/proxy.ts')
  if (isServerOwned) {
    return []
  }

  const source = readFileSync(path, 'utf8')
  return serverEnvironmentNames
    .filter((marker) => source.includes(marker))
    .map((marker) => ({ marker: `${marker} source reference`, path }))
})

const violations = [
  ...leakedMarkers,
  ...leakedValues,
  ...unsafeSourceReferences,
]

if (violations.length > 0) {
  const details = violations
    .map(({ marker, path }) => `${marker} in ${path}`)
    .join('\n')
  throw new Error(
    `Server-only environment markers found in client output:\n${details}`,
  )
}

console.log(
  `Client bundle scan passed (${filesIn(outputDirectory).length} files checked).`,
)
