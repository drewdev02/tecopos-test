import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import { InternalSignerService } from './internal-signer.service.js';

describe('InternalSignerService', () => {
  let service: InternalSignerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternalSignerService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('internal-secret-key'),
          },
        },
      ],
    }).compile();

    service = module.get<InternalSignerService>(InternalSignerService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('generates deterministic signature given fixed inputs', () => {
    // AI-assisted test case
    jest.spyOn(Date, 'now').mockReturnValue(1_710_000_000_000);

    const result = service.sign('post', '/bank/accounts?limit=10', 'user-abc');

    const expectedTimestamp = '1710000000';
    const expectedCanonical = 'user-abc:POST:/bank/accounts?limit=10:1710000000';
    const expectedSignature = createHmac('sha256', 'internal-secret-key')
      .update(expectedCanonical)
      .digest('hex');

    expect(result).toEqual({
      timestamp: expectedTimestamp,
      signature: expectedSignature,
    });
  });
});
