// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CategoryListing } from './category-listing'

afterEach(cleanup)

describe('category listing', () => {
  it('renders a localized category and links only to the public Story detail', () => {
    render(
      <CategoryListing
        categoryKey="design-history"
        locale="pt-PT"
        stories={[
          {
            hook: 'E se um jardim marcasse o tempo?',
            readingMinutes: 2,
            slug: 'jardins-mecanicos',
            storyKey: 'clockwork-gardens',
            title: 'Jardins Mecânicos',
          },
        ]}
      />,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'História do design' }),
    ).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: /Read the preview/u })
        .getAttribute('href'),
    ).toBe('/pt-PT/stories/jardins-mecanicos')
    expect(screen.queryByText(/paid body/u)).toBeNull()
  })
})
