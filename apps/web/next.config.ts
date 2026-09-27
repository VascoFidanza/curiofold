import type { NextConfig } from 'next'

import {
  privateContentHeaders,
  publicIndexingHeaders,
  securityHeaders,
} from './src/server/security-headers'

const nextConfig: NextConfig = {
  headers: () =>
    Promise.resolve([
      {
        headers: [
          ...securityHeaders.map((header) => ({ ...header })),
          ...publicIndexingHeaders(process.env.VERCEL_ENV),
        ],
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
