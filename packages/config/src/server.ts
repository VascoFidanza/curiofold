import 'server-only'

import { parseIdentityEnvironment, parseServerEnvironment } from './env'

/** Evaluate server configuration only from a server-owned call site. */
export function getServerEnvironment() {
  return parseServerEnvironment(process.env)
}

export function getIdentityEnvironment() {
  return parseIdentityEnvironment(process.env)
}

export { parseIdentityEnvironment }
export type { IdentityEnvironment } from './env'
