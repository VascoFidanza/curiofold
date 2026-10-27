import { vi } from 'vitest'

// Next.js enforces this marker during builds. Node unit tests are not Client
// Components; keep the marker inert here while testing real server behavior.
vi.mock('server-only', () => ({}))
