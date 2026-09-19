import { parseServerEnvironment } from './env'

/** Evaluate server configuration only from a server-owned call site. */
export function getServerEnvironment() {
  return parseServerEnvironment(process.env)
}
