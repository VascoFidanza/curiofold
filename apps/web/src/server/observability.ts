import { randomUUID } from 'node:crypto'

type LogLevel = 'debug' | 'error' | 'info' | 'warn'

export interface SafeLogContext {
  auditEventId?: string
  dependency?: string
  durationMs?: number
  errorKind?: string
  method?: string
  orderId?: string
  outcome?: string
  requestId?: string
  route?: string
  statusCode?: number
  storyId?: string
}

interface LoggerOptions {
  clock?: () => Date
  environment?: string
  minimumLevel?: LogLevel
  release?: string
  sink?: (level: LogLevel, line: string) => void
}

export interface StructuredLogger {
  debug(event: string, context?: SafeLogContext): void
  error(event: string, context?: SafeLogContext): void
  info(event: string, context?: SafeLogContext): void
  warn(event: string, context?: SafeLogContext): void
}

interface ObserverDependencies {
  idFactory?: () => string
  logger?: StructuredLogger
  now?: () => number
}

export interface RequestContext {
  requestId: string
}

const safeContextKeys = [
  'auditEventId',
  'dependency',
  'durationMs',
  'errorKind',
  'method',
  'orderId',
  'outcome',
  'requestId',
  'route',
  'statusCode',
  'storyId',
] as const satisfies readonly (keyof SafeLogContext)[]

const requestIdPattern = /^[A-Za-z0-9._:-]{8,120}$/
const structuredValuePattern = /^[A-Za-z0-9._:-]{1,160}$/
const routePattern = /^\/[A-Za-z0-9._:/[\]()-]{0,159}$/
const logLevelRank: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

function configuredLogLevel(value: string | undefined): LogLevel {
  return value === 'debug' ||
    value === 'info' ||
    value === 'warn' ||
    value === 'error'
    ? value
    : 'info'
}

function sanitizeText(value: string, maximumLength = 160): string {
  return Array.from(value)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0
      return codePoint > 31 && codePoint !== 127
    })
    .join('')
    .slice(0, maximumLength)
}

function safeRuntimeValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  return sanitizeText(value, 120)
}

/**
 * Runtime filtering is intentional: callers cannot leak arbitrary fields by
 * bypassing TypeScript or forwarding an untrusted object.
 */
export function sanitizeLogContext(
  context: Record<string, unknown>,
): Record<string, number | string> {
  const sanitized: Record<string, number | string> = {}

  for (const key of safeContextKeys) {
    const value = context[key]
    if (typeof value === 'string' && value.length > 0) {
      const text = sanitizeText(value)
      const pattern = key === 'route' ? routePattern : structuredValuePattern
      if (pattern.test(text)) {
        sanitized[key] = text
      }
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      sanitized[key] = value
    }
  }

  return sanitized
}

function defaultSink(level: LogLevel, line: string): void {
  if (level === 'error') {
    console.error(line)
    return
  }
  if (level === 'warn') {
    console.warn(line)
    return
  }
  console.log(line)
}

export function createStructuredLogger(
  options: LoggerOptions = {},
): StructuredLogger {
  const clock = options.clock ?? (() => new Date())
  const environment = safeRuntimeValue(
    options.environment ?? process.env.NEXT_PUBLIC_ENVIRONMENT,
  )
  const release = safeRuntimeValue(
    options.release ?? process.env.VERCEL_GIT_COMMIT_SHA,
  )
  const minimumLevel =
    options.minimumLevel ?? configuredLogLevel(process.env.LOG_LEVEL)
  const sink = options.sink ?? defaultSink

  const write = (
    level: LogLevel,
    event: string,
    context: SafeLogContext = {},
  ) => {
    if (logLevelRank[level] < logLevelRank[minimumLevel]) {
      return
    }

    const line = JSON.stringify({
      timestamp: clock().toISOString(),
      level,
      event: structuredValuePattern.test(event)
        ? sanitizeText(event, 120)
        : 'invalid_event',
      service: 'curiofold-web',
      ...(environment ? { environment } : {}),
      ...(release ? { release } : {}),
      ...sanitizeLogContext(context as Record<string, unknown>),
    })

    sink(level, line)
  }

  return {
    debug: (event, context) => {
      write('debug', event, context)
    },
    error: (event, context) => {
      write('error', event, context)
    },
    info: (event, context) => {
      write('info', event, context)
    },
    warn: (event, context) => {
      write('warn', event, context)
    },
  }
}

export const runtimeLogger = createStructuredLogger()

export function resolveRequestId(
  request: Request,
  idFactory: () => string = randomUUID,
): string {
  const candidate =
    request.headers.get('x-request-id') ?? request.headers.get('x-vercel-id')

  return candidate && requestIdPattern.test(candidate) ? candidate : idFactory()
}

function errorKind(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError'
}

function problemResponse(requestId: string): Response {
  return Response.json(
    {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      code: 'internal_error',
      requestId,
    },
    {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/problem+json',
      },
    },
  )
}

export async function observeRoute(
  request: Request,
  route: string,
  handler: (context: RequestContext) => Promise<Response>,
  dependencies: ObserverDependencies = {},
): Promise<Response> {
  const logger = dependencies.logger ?? runtimeLogger
  const now = dependencies.now ?? performance.now.bind(performance)
  const requestId = resolveRequestId(request, dependencies.idFactory)
  const startedAt = now()
  const baseContext = { method: request.method, requestId, route }

  logger.info('http.request.started', baseContext)

  try {
    const response = await handler({ requestId })
    response.headers.set('X-Request-Id', requestId)
    logger.info('http.request.completed', {
      ...baseContext,
      durationMs: Math.max(0, Math.round(now() - startedAt)),
      statusCode: response.status,
    })
    return response
  } catch (error) {
    logger.error('http.request.failed', {
      ...baseContext,
      durationMs: Math.max(0, Math.round(now() - startedAt)),
      errorKind: errorKind(error),
      statusCode: 500,
    })
    const response = problemResponse(requestId)
    response.headers.set('X-Request-Id', requestId)
    return response
  }
}
