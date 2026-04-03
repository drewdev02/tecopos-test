import { randomUUID } from 'node:crypto';

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  originalUrl?: string;
  url: string;
  __requestStartedAt?: number;
};

type ResponseLike = {
  statusCode: number;
  locals: { errorCode?: string };
  setHeader: (name: string, value: string) => void;
  on: (event: 'finish', listener: () => void) => void;
};

type NextLike = () => void;

const STATUS_CODE_TO_ERROR_CODE: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  404: 'NOT_FOUND',
  408: 'REQUEST_TIMEOUT',
  409: 'CONFLICT',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
};

export function requestLoggingMiddleware(request: RequestLike, response: ResponseLike, next: NextLike): void {
  const startedAt = Date.now();
  const correlationId = resolveCorrelationId(request.headers['x-correlation-id']);

  request.__requestStartedAt = startedAt;
  response.setHeader('x-correlation-id', correlationId);

  response.on('finish', () => {
    const statusCode = response.statusCode;
    const payload: Record<string, string | number> = {
      timestamp: new Date().toISOString(),
      level: statusCode >= 400 ? 'error' : 'info',
      service: 'bank-accounts',
      correlationId,
      method: request.method,
      path: request.originalUrl ?? request.url,
      statusCode,
      latencyMs: Date.now() - startedAt,
    };

    if (statusCode >= 400) {
      payload['errorCode'] = response.locals.errorCode ?? STATUS_CODE_TO_ERROR_CODE[statusCode] ?? 'INTERNAL_SERVER_ERROR';
    }

    process.stdout.write(`${JSON.stringify(payload)}\n`);
  });

  next();
}

function resolveCorrelationId(value: string | string[] | undefined): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim().length > 0) {
    return value[0];
  }

  return randomUUID();
}
