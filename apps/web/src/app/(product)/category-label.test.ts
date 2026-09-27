import { describe, expect, it } from 'vitest'

import { categoryLabel } from '@curiofold/content'

describe('category labels', () => {
  it('uses reviewed labels for available locales', () => {
    expect(categoryLabel('design-history', 'en')).toBe('Design history')
    expect(categoryLabel('design-history', 'pt-PT')).toBe('História do design')
  })

  it('keeps a readable fallback for an editorial key without a label yet', () => {
    expect(categoryLabel('space-flight', 'en')).toBe('Space Flight')
  })
})
