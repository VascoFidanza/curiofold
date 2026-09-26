import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const chromiumWidths = [
  320, 360, 375, 390, 430, 480, 768, 820, 1024, 1280, 1440, 1920, 2560, 917,
] as const
const crossEngineWidths = [320, 768, 1440, 2560] as const

test.describe('responsive browser contract', () => {
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

  test('Reader and expanded navigation preserve content and actions', async ({
    browserName,
    page,
  }) => {
    const widths =
      browserName === 'chromium' ? chromiumWidths : crossEngineWidths

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
