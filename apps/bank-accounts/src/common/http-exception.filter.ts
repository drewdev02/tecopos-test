import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';

type ExceptionResponse = string | { message?: string | string[]; code?: string; error?: string };
type HttpResponse = {
  locals: { errorCode?: string };
  status: (statusCode: number) => {
    json: (body: {
      statusCode: number;
      code: string;
      message: string;
      timestamp: string;
      path: string;
    }) => void;
  };
};

type HttpRequest = {
  url: string;
};

const STATUS_CODE_TO_ERROR_CODE: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  404: 'NOT_FOUND',
  408: 'REQUEST_TIMEOUT',
  409: 'CONFLICT',
  429: 'TOO_MANY_REQUESTS',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpResponse>();
    const request = ctx.getRequest<HttpRequest>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException ? exception.getStatus() : 500;
    const responseBody: ExceptionResponse = isHttpException
      ? (exception.getResponse() as ExceptionResponse)
      : 'Internal server error';

    const message = this.extractMessage(responseBody);
    const code = this.extractCode(responseBody, statusCode);
    response.locals.errorCode = code;

    response.status(statusCode).json({
      statusCode,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private extractMessage(responseBody: ExceptionResponse): string {
    if (typeof responseBody === 'string') {
      return responseBody;
    }

    if (Array.isArray(responseBody.message)) {
      return responseBody.message.join(', ');
    }

    return responseBody.message ?? 'Unexpected error';
  }

  private extractCode(responseBody: ExceptionResponse, statusCode: number): string {
    if (typeof responseBody !== 'string' && typeof responseBody.code === 'string') {
      return responseBody.code;
    }

    return STATUS_CODE_TO_ERROR_CODE[statusCode] ?? 'INTERNAL_SERVER_ERROR';
  }
}
