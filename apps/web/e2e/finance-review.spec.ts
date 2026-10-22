import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('finance review is accessible, keyboard-operable and policy-gated', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => {
    errors.push(error.message)
  })
  let requests = 0
  await page.route('**/api/internal/payment-reversals', async (route) => {
    requests++
    expect(route.request().postDataJSON()).toEqual({
      orderId: '11111111-1111-4111-8111-111111111111',
      reasonCode: 'customer_request',
    })
    expect(route.request().headers()['idempotency-key']).toBeTruthy()
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ policyRequired: true }),
    })
  })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/test-fixtures/finance-review')
  await expect(
    page.getByText('Manual review — policy approval required', {
      exact: false,
    }),
  ).toBeVisible()
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([])
  await page
    .getByLabel('Payment order ID')
    .fill('11111111-1111-4111-8111-111111111111')
  await page.getByRole('button', { name: 'Record refund review' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toContainText('No refund was issued')
  await expect(
    page.getByRole('button', { name: 'Review recorded' }),
  ).toBeDisabled()
  expect(requests).toBe(1)
  expect(errors).toEqual([])
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test('finance routes deny anonymous access without leaking the review queue', async ({
  page,
  request,
}) => {
  const response = await request.get('/api/internal/payment-reversals')
  expect([401, 503]).toContain(response.status()) // No Clerk credentials in local/CI fixtures.
  expect(response.headers()['cache-control']).toBe('private, no-store')
  expect(await response.json()).not.toHaveProperty('reviews')
  await page.goto('/operations/finance')
  await expect(
    page.getByRole('heading', {
      name: /Finance (access and recent MFA required|review is unavailable)/u,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Record refund review' }),
  ).toHaveCount(0)
})
