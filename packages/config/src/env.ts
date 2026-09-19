import { z } from 'zod'

const environmentNames = [
  'local',
  'test',
  'preview',
  'staging',
  'production',
] as const

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3000'),
  NEXT_PUBLIC_ENVIRONMENT: z.enum(environmentNames).default('local'),
})

const serverEnvironmentSchema = publicEnvironmentSchema.extend({
  CLERK_SECRET_KEY: z.string().min(1),
  DATABASE_URL: z.url(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  SENTRY_DSN: z.url().optional(),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
})

export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>
export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>

export function parsePublicEnvironment(
  source: Record<string, string | undefined>,
): PublicEnvironment {
  return publicEnvironmentSchema.parse(source)
}

export function parseServerEnvironment(
  source: Record<string, string | undefined>,
): ServerEnvironment {
  return serverEnvironmentSchema.parse(source)
}
