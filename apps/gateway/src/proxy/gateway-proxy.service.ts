import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  INTERNAL_SIGNATURE_HEADER,
  INTERNAL_TIMESTAMP_HEADER,
  INTERNAL_USER_ID_HEADER,
  InternalSignerService,
} from '../security/internal-signer.service.js';

type ForwardOptions = {
  baseUrl: string;
  method: string;
  path: string;
  headers: Record<string, string | undefined>;
  body?: unknown;
  userId?: string;
};

export type ForwardResult = {
  statusCode: number;
  body?: unknown;
};

const TIMEOUT_MS = 2_000;

@Injectable()
export class GatewayProxyService {
  private readonly ssoServiceUrl: string;
  private readonly bankServiceUrl: string;

  public constructor(
    configService: ConfigService,
    private readonly internalSignerService: InternalSignerService,
  ) {
    this.ssoServiceUrl = configService.getOrThrow<string>('gateway.ssoServiceUrl');
    this.bankServiceUrl = configService.getOrThrow<string>('gateway.bankServiceUrl');
  }

  public async forwardToSso(options: Omit<ForwardOptions, 'baseUrl'>): Promise<ForwardResult> {
    return this.forward({
      ...options,
      baseUrl: this.ssoServiceUrl,
    });
  }

  public async forwardToBank(options: Omit<ForwardOptions, 'baseUrl'>): Promise<ForwardResult> {
    return this.forward({
      ...options,
      baseUrl: this.bankServiceUrl,
    });
  }

  private async forward(options: ForwardOptions): Promise<ForwardResult> {
    const targetUrl = new URL(options.path, this.ensureTrailingSlash(options.baseUrl));
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, TIMEOUT_MS);

    const headers = this.buildHeaders(options);
    const requestInit = this.createRequestInit(options.method, headers, options.body, controller.signal);

    try {
      const response = await fetch(targetUrl, requestInit);
      const body = await this.parseBody(response);

      if (!response.ok) {
        throw this.toHttpException(response.status, body);
      }

      return {
        statusCode: response.status,
        body,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          code: 'DOWNSTREAM_UNAVAILABLE',
          message: 'Downstream service unavailable',
        },
        502,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private createRequestInit(
    method: string,
    headers: Headers,
    body: unknown,
    signal: AbortSignal,
  ): RequestInit {
    const normalizedMethod = method.toUpperCase();
    const shouldSendBody = !['GET', 'HEAD'].includes(normalizedMethod) && body !== undefined;

    if (!headers.has('content-type') && shouldSendBody) {
      headers.set('content-type', 'application/json');
    }

    return {
      method: normalizedMethod,
      headers,
      body: shouldSendBody ? JSON.stringify(body) : undefined,
      signal,
    };
  }

  private buildHeaders(options: ForwardOptions): Headers {
    const headers = new Headers();
    for (const [name, value] of Object.entries(options.headers)) {
      if (!value) {
        continue;
      }

      const lowerName = name.toLowerCase();
      if (['host', 'connection', 'content-length'].includes(lowerName)) {
        continue;
      }

      headers.set(lowerName, value);
    }

    if (options.userId) {
      const { timestamp, signature } = this.internalSignerService.sign(
        options.method,
        options.path,
        options.userId,
      );

      headers.set(INTERNAL_USER_ID_HEADER, options.userId);
      headers.set(INTERNAL_TIMESTAMP_HEADER, timestamp);
      headers.set(INTERNAL_SIGNATURE_HEADER, signature);
    }

    return headers;
  }

  private async parseBody(response: Response): Promise<unknown> {
    if (response.status === 204) {
      return undefined;
    }

    const contentType = response.headers.get('content-type') ?? '';
    const textBody = await response.text();

    if (textBody.length === 0) {
      return undefined;
    }

    if (contentType.includes('application/json')) {
      try {
        return JSON.parse(textBody) as unknown;
      } catch {
        return textBody;
      }
    }

    return textBody;
  }

  private toHttpException(statusCode: number, responseBody: unknown): HttpException {
    if (
      typeof responseBody === 'object' &&
      responseBody !== null &&
      'message' in responseBody &&
      typeof (responseBody as { message: unknown }).message === 'string'
    ) {
      return new HttpException(responseBody, statusCode);
    }

    return new HttpException(
      {
        code: 'DOWNSTREAM_REQUEST_FAILED',
        message: typeof responseBody === 'string' ? responseBody : 'Downstream request failed',
      },
      statusCode,
    );
  }

  private ensureTrailingSlash(value: string): string {
    return value.endsWith('/') ? value : `${value}/`;
  }
}
