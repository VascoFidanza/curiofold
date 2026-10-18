import { z } from 'zod'

/** Strict mailbox only: no mailto headers, multiple recipients or control characters. */
export function supportContact(value: string | undefined): string | null {
  if (!value || /[\s?&#%,:]/u.test(value)) return null
  const parsed = z.email().safeParse(value)
  return parsed.success ? parsed.data : null
}
