import { describe, expect, it } from 'vitest'
import { supportContact } from './support'

describe('support contact configuration', () => {
  it('accepts a single mailbox', () => {
    expect(supportContact('help@example.com')).toBe('help@example.com')
  })
  it.each([
    undefined,
    '',
    'not-an-email',
    'mailto:help@example.com',
    'help@example.com?bcc=other@example.com',
    'help@example.com\r\nBcc:other@example.com',
    'help@example.com,other@example.com',
    'help%0a@example.com',
  ])('rejects missing or unsafe configuration %j', (value) => {
    expect(supportContact(value)).toBeNull()
  })
})
