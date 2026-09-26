import { describe, expect, it } from 'vitest'

import { resolveCreditsReturnContext } from './return-context'

const storyPath = '/en/stories/clockwork-gardens'
const orderId = '11111111-1111-4111-8111-111111111111'

describe('Credits sign-in return context', () => {
  it('preserves the originating Story through sign-in', () => {
    const context = resolveCreditsReturnContext({ return: storyPath })
    expect(context.returnPath).toBe(storyPath)
    expect(
      new URL(context.signInPath, 'https://curiofold.invalid').searchParams.get(
        'redirect_url',
      ),
    ).toBe(`/credits?return=${encodeURIComponent(storyPath)}`)
  })

  it('preserves an owner-scoped order when a session expires on Checkout return', () => {
    const context = resolveCreditsReturnContext({
      payment_order: orderId,
      return: storyPath,
    })
    expect(context.orderId).toBe(orderId)
    const creditsPath = new URL(
      context.signInPath,
      'https://curiofold.invalid',
    ).searchParams.get('redirect_url')
    expect(creditsPath).toBe(
      `/credits?payment_order=${orderId}&return=${encodeURIComponent(storyPath)}`,
    )
  })

  it('drops unsafe or malformed inputs before constructing redirects', () => {
    const context = resolveCreditsReturnContext({
      payment_order: 'bad',
      return: 'https://attacker.example',
    })
    expect(context).toEqual({
      orderId: null,
      returnPath: '/account',
      signInPath: '/sign-in?redirect_url=%2Fcredits',
    })
  })
})
