import { z } from 'zod'

export const publicationManifestSchema = z
  .object({
    schemaVersion: z.literal('content-release/v1'),
    action: z.enum(['publish', 'archive']),
    storyPath: z
      .string()
      .regex(
        /^content\/stories\/[a-z0-9-]+\/[A-Za-z0-9-]+\/[a-zA-Z0-9._-]+\.json$/u,
      ),
    expectedCurrent: z
      .object({
        revision: z.number().int().positive(),
        state: z.enum(['published', 'archived']),
      })
      .strict()
      .nullable(),
    operator: z.string().trim().min(1).max(240),
    reason: z.string().trim().min(1).max(1000),
  })
  .strict()
