import type { NextConfig } from 'next'

import { securityHeaders } from './src/server/security-headers'

const nextConfig: NextConfig = {
  headers: () =>
    Promise.resolve([
      {
        headers: securityHeaders.map((header) => ({ ...header })),
        source: '/(.*)',
      },
    ]),
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@curiofold/config', '@curiofold/ui'],
}

export default nextConfig
