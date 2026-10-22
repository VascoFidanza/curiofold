import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

it('pins the existing app to one Frankfurt region without paid topology changes', () => {
  const configuration: unknown = JSON.parse(
    readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'),
  )
  expect(configuration).toEqual({
    $schema: 'https://openapi.vercel.sh/vercel.json',
    regions: ['fra1'],
  })
})
