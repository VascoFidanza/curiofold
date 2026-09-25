// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { createElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  ApplicationShell,
  type ApplicationShellLabels,
} from './application-shell'

afterEach(() => {
  cleanup()
})

function shell(
  labels?: ApplicationShellLabels,
  activeNavigation: 'discover' | 'library' = 'discover',
) {
  const children = createElement('h1', null, 'Curiofold')
  const props = labels
    ? { activeNavigation, children, labels }
    : { activeNavigation, children }

  return createElement(ApplicationShell, props)
}

describe('ApplicationShell', () => {
  it('provides landmark, skip-link and navigation semantics', () => {
    render(shell())

    expect(
      screen
        .getByRole('link', { name: 'Skip to main content' })
        .getAttribute('href'),
    ).toBe('#main-content')
    expect(screen.getByRole('main').getAttribute('id')).toBe('main-content')
    expect(
      screen.getByRole('navigation', { name: 'Primary navigation' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('navigation', { name: 'Mobile navigation' }),
    ).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Discover' })).toHaveLength(2)
    for (const link of screen.getAllByRole('link', { name: 'Discover' })) {
      expect(link.getAttribute('aria-current')).toBe('page')
    }
  })

  it('preserves long localized labels without changing the semantic structure', () => {
    const labels: ApplicationShellLabels = {
      account: 'Kontoeinstellungen und Sicherheit',
      collections: 'Kuratierte Sammlungen',
      discover: 'Entdecken und weiterlesen',
      library: 'Ihre persönliche Bibliothek',
      progress: 'Lesefortschritt',
      search: 'Geschichten durchsuchen',
      skipToContent: 'Direkt zum Hauptinhalt springen',
    }

    render(shell(labels, 'library'))

    expect(screen.getAllByText(labels.library)).toHaveLength(2)
    expect(screen.getAllByText(labels.account)).toHaveLength(2)
    expect(screen.getByRole('main')).toBeTruthy()
  })

  it('has no detectable automated accessibility violations', async () => {
    const { container } = render(shell())
    const result = await axe.run(container, {
      rules: {
        // jsdom cannot calculate rendered colour contrast; responsive browser
        // validation covers the approved token combinations separately.
        'color-contrast': { enabled: false },
      },
    })

    expect(result.violations).toEqual([])
  })
})
