import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import { GatewayTrustVerifierService } from './gateway-trust-verifier.service.js';

describe('GatewayTrustVerifierService', () => {
  let service: GatewayTrustVerifierService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayTrustVerifierService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'bank.internalSignatureSecret') {
                return 'bank-secret';
              }

              if (key === 'bank.internalSignatureMaxSkewSeconds') {
                return 60;
              }

              throw new Error(`Unexpected config key: ${key}`);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<GatewayTrustVerifierService>(GatewayTrustVerifierService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const buildSignature = (input: {
    userId: string;
    method: string;
    path: string;
    timestamp: string;
  }): string => {
    const canonical = [input.userId, input.method.toUpperCase(), input.path, input.timestamp].join(':');
    return createHmac('sha256', 'bank-secret').update(canonical).digest('hex');
  };

  it('validates correct signature and fresh timestamp', () => {
    // AI-assisted test case
    jest.spyOn(Date, 'now').mockReturnValue(1_710_000_030_000);

    const timestamp = '1710000000';
    const signature = buildSignature({
      userId: 'user-1',
      method: 'GET',
      path: '/v1/webhooks',
      timestamp,
    });

    const result = service.verify({
      method: 'GET',
      path: '/v1/webhooks',
      headers: {
        'x-user-id': 'user-1',
        'x-internal-timestamp': timestamp,
        'x-internal-signature': signature,
      },
    });

    expect(result).toEqual({ ok: true, userId: 'user-1' });
  });

  it('rejects missing headers', () => {
    // AI-assisted test case
    const result = service.verify({
      method: 'GET',
      path: '/v1/webhooks',
      headers: {
        'x-user-id': 'user-1',
      },
    });

    expect(result).toEqual({
      ok: false,
      code: 'MISSING_INTERNAL_SIGNATURE',
      message: 'Missing required internal trust headers',
    });
  });

  it('rejects tampered signature', () => {
    // AI-assisted test case
    jest.spyOn(Date, 'now').mockReturnValue(1_710_000_000_000);

    const result = service.verify({
      method: 'POST',
      path: '/v1/webhooks',
      headers: {
        'x-user-id': 'user-1',
        'x-internal-timestamp': '1710000000',
        'x-internal-signature': 'a'.repeat(64),
      },
    });

    expect(result).toEqual({
      ok: false,
      code: 'INVALID_INTERNAL_SIGNATURE',
      message: 'Internal signature is invalid',
    });
  });

  it('rejects expired timestamp', () => {
    // AI-assisted test case
    jest.spyOn(Date, 'now').mockReturnValue(1_710_000_200_000);

    const oldTimestamp = '1710000000';
    const signature = buildSignature({
      userId: 'user-1',
      method: 'GET',
      path: '/v1/webhooks',
      timestamp: oldTimestamp,
    });

    const result = service.verify({
      method: 'GET',
      path: '/v1/webhooks',
      headers: {
        'x-user-id': 'user-1',
        'x-internal-timestamp': oldTimestamp,
        'x-internal-signature': signature,
      },
    });

    expect(result).toEqual({
      ok: false,
      code: 'EXPIRED_INTERNAL_SIGNATURE',
      message: 'Internal signature timestamp is outside allowed clock skew',
    });
  });
});
