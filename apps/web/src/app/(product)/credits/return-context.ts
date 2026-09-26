import { safeReturnPath } from '@curiofold/domain'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export function resolveCreditsReturnContext(
  query: Record<string, string | string[] | undefined>,
) {
  const returnValue = query.return
  const safePath = safeReturnPath(
    typeof returnValue === 'string' ? returnValue : null,
    '/account',
  )
  const returnPath = safePath.startsWith('/credits') ? '/account' : safePath
  const orderValue = query.payment_order
  const orderId =
    typeof orderValue === 'string' && uuidPattern.test(orderValue)
      ? orderValue
      : null

  const redirectQuery = new URLSearchParams()
  if (orderId) redirectQuery.set('payment_order', orderId)
  if (returnPath !== '/account') redirectQuery.set('return', returnPath)
  const creditsPath = `/credits${redirectQuery.size ? `?${redirectQuery.toString()}` : ''}`

  return {
    orderId,
    returnPath,
    signInPath: `/sign-in?redirect_url=${encodeURIComponent(creditsPath)}`,
  }
}
