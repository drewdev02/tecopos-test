import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GatewayProxyService } from './gateway-proxy.service.js';
import {
  InternalSignerService,
  INTERNAL_SIGNATURE_HEADER,
  INTERNAL_TIMESTAMP_HEADER,
  INTERNAL_USER_ID_HEADER,
} from '../security/internal-signer.service.js';

type MockedConfigService = {
  getOrThrow: jest.Mock;
};

type MockedInternalSignerService = {
  sign: jest.Mock;
};

describe('GatewayProxyService', () => {
  let service: GatewayProxyService;
  let configService: MockedConfigService;
  let internalSignerService: MockedInternalSignerService;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'gateway.ssoServiceUrl') {
          return 'https://sso.example.internal';
        }

        if (key === 'gateway.bankServiceUrl') {
          return 'https://bank.example.internal';
        }

        throw new Error(`Unexpected config key: ${key}`);
      }),
    };

    internalSignerService = {
      sign: jest.fn(),
    };

    service = new GatewayProxyService(
      configService as unknown as ConfigService,
      internalSignerService as unknown as InternalSignerService,
    );

    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('forwards auth request with method/path/query/body and returns downstream payload', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'jwt-token' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const result = await service.forwardToSso({
      method: 'post',
      path: '/auth/login?next=%2Fdashboard',
      headers: {
        authorization: 'Bearer gateway-token',
        host: 'gateway.local',
        connection: 'keep-alive',
        'content-length': '999',
      },
      body: {
        email: 'user@example.com',
        password: 'secret',
      },
    });

    expect(result).toEqual({
      statusCode: 200,
      body: { accessToken: 'jwt-token' },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [URL, RequestInit];

    expect(url.toString()).toBe('https://sso.example.internal/auth/login?next=%2Fdashboard');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({
      email: 'user@example.com',
      password: 'secret',
    }));

    const headers = init.headers as Headers;
    expect(headers.get('authorization')).toBe('Bearer gateway-token');
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('host')).toBeNull();
    expect(headers.get('connection')).toBeNull();
    expect(headers.get('content-length')).toBeNull();
  });

  it('forwards bank request and propagates trusted user + internal signed headers', async () => {
    internalSignerService.sign.mockReturnValue({
      timestamp: '1710000000',
      signature: 'signed-header-value',
    });

    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await service.forwardToBank({
      method: 'GET',
      path: '/accounts?limit=20&page=2',
      headers: {
        authorization: 'Bearer user-token',
      },
      userId: 'user-123',
    });

    expect(internalSignerService.sign).toHaveBeenCalledWith('GET', '/accounts?limit=20&page=2', 'user-123');
    const [, init] = fetchSpy.mock.calls[0] as [URL, RequestInit];
    const headers = init.headers as Headers;

    expect(headers.get('authorization')).toBe('Bearer user-token');
    expect(headers.get(INTERNAL_USER_ID_HEADER)).toBe('user-123');
    expect(headers.get(INTERNAL_TIMESTAMP_HEADER)).toBe('1710000000');
    expect(headers.get(INTERNAL_SIGNATURE_HEADER)).toBe('signed-header-value');
  });

  it('maps downstream unavailable/timeout failures to controlled HttpException', async () => {
    fetchSpy.mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    const execution = service.forwardToSso({
      method: 'GET',
      path: '/auth/register',
      headers: {},
    });

    await expect(execution).rejects.toBeInstanceOf(HttpException);
    await expect(execution).rejects.toMatchObject({
      status: 502,
      response: {
        code: 'DOWNSTREAM_UNAVAILABLE',
        message: 'Downstream service unavailable',
      },
    });
  });
});
