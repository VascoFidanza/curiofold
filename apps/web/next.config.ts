import type { NextConfig } from 'next'

import {
  privateContentHeaders,
  securityHeaders,
} from './src/server/security-headers'

const nextConfig: NextConfig = {
  headers: () =>
    Promise.resolve([
      {
        headers: securityHeaders.map((header) => ({ ...header })),
        source: '/(.*)',
      },
      {
        headers: privateContentHeaders.map((header) => ({ ...header })),
        source: '/:locale/stories/:slug/read',
      },
    ]),
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@curiofold/config', '@curiofold/ui'],
}

export default nextConfig
