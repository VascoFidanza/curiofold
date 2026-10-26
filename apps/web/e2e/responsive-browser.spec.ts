import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const chromiumWidths = [
  320, 360, 375, 390, 430, 480, 768, 820, 1024, 1280, 1440, 1920, 2560, 917,
] as const
const crossEngineWidths = [320, 768, 1440, 2560] as const

test.describe('responsive browser contract', () => {
  test('legal information is discoverable and never presents drafts as active policy', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 844 })
    await page.goto('/legal')
    await expect(
      page.getByRole('heading', {
        name: 'Legal and privacy information',
        exact: true,
      }),
    ).toBeVisible()
    await expect(page.locator('li > a[href^="/legal/"]')).toHaveCount(5)
    await page
      .getByRole('link', { name: 'Privacy policy', exact: true })
      .click()
    await expect(
      page
        .getByRole('heading', { name: 'Not yet available', exact: true })
        .or(page.locator('time')),
    ).toBeVisible()
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false)
    await page
      .getByRole('link', {
        name: 'All legal and privacy information',
        exact: true,
      })
      .focus()
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('heading', {
        name: 'Legal and privacy information',
        exact: true,
      }),
    ).toBeVisible()
  })
  test('short content reserves the viewport without hiding the support link', async ({
    page,
  }) => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 844 })
      await page.goto('/test-fixtures/shell-expansion')
      const footerTop = await page
        .getByRole('contentinfo')
        .evaluate((footer) => footer.getBoundingClientRect().top)
      expect(footerTop).toBeGreaterThanOrEqual(844)
      const support = page.getByRole('link', { name: 'Help and support' })
      await support.scrollIntoViewIfNeeded()
      await expect(support).toBeInViewport()
    }
  })
  test('nonce CSP allows Reader hydration but blocks injected inline scripts', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (event) => {
        sessionStorage.setItem('curiofold-test-csp-blocked', event.blockedURI)
      })
    })
    await page.route('**/test-fixtures/reader', async (route) => {
      const response = await route.fetch()
      const body = (await response.text()).replace(
        '</head>',
        '<script id="attack-probe">document.documentElement.dataset.cspAttack="executed"</script></head>',
      )
      await route.fulfill({ response, body })
    })
    await page.route('**/api/v1/reading-progress/**', (route) =>
      route.fulfill({ body: '{}', contentType: 'application/json' }),
    )
    const first = await page.goto('/test-fixtures/reader')
    const policy = first?.headers()['content-security-policy'] ?? ''
    const nonce = /'nonce-([^']+)'/u.exec(policy)?.[1]
    expect(nonce).toBeTruthy()
    expect(policy).toContain("'strict-dynamic'")
    if (!first) throw new Error('Reader document response missing')
    // Inspect the delivered document, not scripts later loaded by trusted JS.
    const scripts = await page.evaluate(
      (html) => {
        const document = new DOMParser().parseFromString(html, 'text/html')
        return Array.from(
          document.querySelectorAll<HTMLScriptElement>(
            'script:not(#attack-probe)',
          ),
        ).map((script) => script.nonce)
      },
      await first.text(),
    )
    expect(scripts.length).toBeGreaterThan(0)
    expect(scripts.every((value) => value === nonce)).toBe(true)
    await expect
      .poll(() =>
        page.evaluate(() =>
          sessionStorage.getItem('curiofold-test-csp-blocked'),
        ),
      )
      .toBe('inline')
    expect(
      await page.locator('html').getAttribute('data-csp-attack'),
    ).toBeNull()
    await page.unroute('**/test-fixtures/reader')
    const second = await page.reload()
    expect(second?.headers()['content-security-policy']).not.toBe(policy)
    await page.getByLabel('Reading settings').click()
    await page.getByRole('button', { name: 'Larger', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Larger', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
  })
  test('Reader keyboard settings, source navigation and skip link remain accessible', async ({
    browserName,
    page,
  }) => {
    await page.route('**/api/v1/reading-progress/**', (route) =>
      route.fulfill({ body: '{}', contentType: 'application/json' }),
    )
    await page.goto('/test-fixtures/reader')
    const skip = page.getByRole('link', { name: 'Skip to Story' })
    await skip.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('#story-content')).toBeFocused()

    const settings = page.getByLabel('Reading settings')
    await settings.focus()
    await page.keyboard.press('Enter')
    const larger = page.getByRole('button', { name: 'Larger', exact: true })
    if (browserName === 'webkit') {
      // Like the shell keyboard test, respect Safari's host Tab preference.
      // Explicit focus still verifies keyboard activation and accessible state.
      await larger.focus()
    } else {
      await page.keyboard.press('Tab')
      await expect(
        page.getByRole('button', { name: 'Smaller', exact: true }),
      ).toBeFocused()
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
    }
    await expect(larger).toBeFocused()
    await page.keyboard.press('Space')
    await expect(larger).toHaveAttribute('aria-pressed', 'true')
    // Scan the settled selected state, not an intermediate colour transition.
    await larger.evaluate(async (button) => {
      await Promise.all(
        button.getAnimations().map((animation) => animation.finished),
      )
    })
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])

    const citation = page.getByRole('link', { name: /^Source 1:/ }).first()
    await citation.focus()
    await page.keyboard.press('Enter')
    const target = await citation.getAttribute('href')
    expect(target).toMatch(/^#source-/)
    if (!target) throw new Error('Citation must reference a source')
    await expect(page.locator(target)).toBeFocused()
  })
  test('public support links existing tools without inventing a contact', async ({
    page,
  }) => {
    await page.goto('/support')
    await expect(
      page.getByRole('heading', { name: 'Help and support', level: 1 }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Open your account' }),
    ).toHaveAttribute('href', '/account')
    await expect(
      page.getByRole('link', { name: 'Visit your Library' }),
    ).toHaveAttribute('href', '/library')
    await expect(
      page.getByText('A support contact has not yet been configured', {
        exact: false,
      }),
    ).toBeVisible()
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0)
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
  test('Story detail reflows at the supported and arbitrary widths', async ({
    browserName,
    page,
  }) => {
    const widths =
      browserName === 'chromium' ? chromiumWidths : crossEngineWidths

    for (const width of widths) {
      await page.setViewportSize({ height: 900, width })
      await page.goto('/test-fixtures/story-detail')

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )
      expect(
        overflow,
        `horizontal overflow at ${String(width)}px`,
      ).toBeLessThanOrEqual(1)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(
        page.getByRole('link', { name: 'Sign in to unlock' }),
      ).toBeVisible()
    }
  })

  // Preserve all widths, without putting 28 navigations under one 30s deadline.
  for (const batch of [0, 1, 2, 3]) {
    test(`Reader and expanded navigation preserve content and actions — viewport set ${String(batch + 1)}`, async ({
      browserName,
      page,
    }) => {
      const widths =
        browserName === 'chromium'
          ? chromiumWidths.slice(batch * 4, (batch + 1) * 4)
          : crossEngineWidths.slice(batch, batch + 1)

      await page.route('**/api/v1/reading-progress/**', async (route) => {
        await route.fulfill({
          body: '{}',
          contentType: 'application/json',
          status: 200,
        })
      })

      for (const width of widths) {
        await page.setViewportSize({ height: 900, width })
        await page.goto('/test-fixtures/reader')
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          ),
          `Reader horizontal overflow at ${String(width)}px`,
        ).toBeLessThanOrEqual(1)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Back' })).toBeVisible()

        await page.goto('/test-fixtures/shell-expansion')
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          ),
          `expanded-label overflow at ${String(width)}px`,
        ).toBeLessThanOrEqual(1)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expect(
          page.getByRole('link', { name: /conta pessoal/i }),
        ).toBeVisible()
      }
    })
  }

  test('keyboard order starts with the skip link and reaches primary content', async ({
    browserName,
    page,
  }) => {
    await page.setViewportSize({ height: 844, width: 390 })
    await page.goto('/test-fixtures/shell-expansion')

    const skipLink = page.getByRole('link', { name: /Saltar diretamente/i })
    const firstFocusableText = await page.evaluate(() => {
      const firstFocusable = document.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      return firstFocusable?.textContent.trim()
    })
    expect(firstFocusableText).toMatch(/^Saltar diretamente/u)

    if (browserName === 'webkit') {
      // WebKit follows the host Safari keyboard-navigation preference, which
      // cannot be enabled portably in CI. The DOM-order assertion above plus
      // explicit focus verifies the same skip-link behavior.
      await skipLink.focus()
    } else {
      await page.keyboard.press('Tab')
    }
    await expect(skipLink).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main-content')).toBeFocused()
  })

  test('reduced motion and accessibility rules remain effective', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ height: 900, width: 375 })
    await page.goto('/test-fixtures/story-detail')

    const scrollBehavior = await page
      .locator('html')
      .evaluate((element) => getComputedStyle(element).scrollBehavior)
    expect(scrollBehavior).toBe('auto')

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test('landscape layout does not hide the main action', async ({ page }) => {
    await page.setViewportSize({ height: 390, width: 844 })
    await page.goto('/test-fixtures/story-detail')

    await expect(
      page.getByRole('link', { name: 'Sign in to unlock' }),
    ).toBeVisible()
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1)
  })
})

test.describe('touch and coarse-pointer contract', () => {
  test('mobile controls remain reachable for touch input', async ({
    browser,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'One engine is sufficient for media-query evidence.',
    )
    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { height: 844, width: 390 },
    })
    const page = await context.newPage()
    await page.goto('/test-fixtures/shell-expansion')

    expect(
      await page.evaluate(() => matchMedia('(pointer: coarse)').matches),
    ).toBe(true)
    const account = page.getByRole('link', { name: /conta pessoal/i })
    await expect(account).toBeVisible()
    expect((await account.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(
      44,
    )

    await context.close()
  })
})
