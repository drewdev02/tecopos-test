import { GatewayTimeoutException, HttpException, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { MockBankClient } from './mock-bank.client.js';
import { RandomBankClient } from './random-bank.client.js';
import type { BankAccount, BankTransaction } from './types/bank-account.types.js';

type FetchMock = jest.MockedFunction<typeof fetch>;

type ConfigShape = {
  'bank.mockApiBaseUrl': string;
  'bank.mockApiTimeoutMs': number;
  'bank.upstreamMode': 'mockapi' | 'hybrid' | 'memory';
};

type ConfigStub = Pick<ConfigService, 'get' | 'getOrThrow'>;

type RandomBankClientStub = {
  listAccounts: jest.Mock;
  getAccountById: jest.Mock;
  listTransactions: jest.Mock;
};

const createConfigStub = (overrides?: Partial<ConfigShape>): ConfigStub => {
  const config: ConfigShape = {
    'bank.mockApiBaseUrl': 'https://example.mockapi.local',
    'bank.mockApiTimeoutMs': 5,
    'bank.upstreamMode': 'hybrid',
    ...overrides,
  };

  return {
    get: jest.fn(<T>(key: keyof ConfigShape) => config[key] as T),
    getOrThrow: jest.fn(<T>(key: keyof ConfigShape) => {
      const value = config[key];
      if (value === undefined || value === null || value === '') {
        throw new Error(`Missing required config key: ${key}`);
      }
      return value as T;
    }),
  };
};

const createRandomStub = (): RandomBankClientStub => ({
  listAccounts: jest.fn(),
  getAccountById: jest.fn(),
  listTransactions: jest.fn(),
});

describe('MockBankClient fallback behavior', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('falls back to random in-memory accounts when dependency is unavailable', async () => {
    const fetchMock: FetchMock = jest.fn().mockRejectedValue(new Error('network down'));
    const randomStub = createRandomStub();
    const fallbackResult = {
      items: [
        {
          id: 'acc-fallback-1',
          userId: 'user-1',
          name: 'Account 1',
          accountNumber: '1234567890',
          balance: 1000,
          currency: 'USD',
        },
      ] as BankAccount[],
    };
    randomStub.listAccounts.mockReturnValue(fallbackResult);

    const client = new MockBankClient(
      createConfigStub({ 'bank.upstreamMode': 'hybrid' }) as ConfigService,
      fetchMock,
      randomStub as unknown as RandomBankClient,
    );

    const result = await client.listAccounts('user-1');

    expect(randomStub.listAccounts).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(fallbackResult);
  });

  it('falls back to random in-memory account lookup on timeout', async () => {
    const abortError = new DOMException('aborted', 'AbortError');
    const fetchMock: FetchMock = jest.fn().mockRejectedValue(abortError);
    const randomStub = createRandomStub();
    const fallbackAccount: BankAccount = {
      id: 'acc-fallback-2',
      userId: 'user-1',
      name: 'Account 2',
      accountNumber: '9876543210',
      balance: 2000,
      currency: 'USD',
    };
    randomStub.getAccountById.mockReturnValue(fallbackAccount);

    const client = new MockBankClient(createConfigStub() as ConfigService, fetchMock, randomStub as unknown as RandomBankClient);

    const result = await client.getAccountById('user-1', 'acc-fallback-2');

    expect(randomStub.getAccountById).toHaveBeenCalledWith('user-1', 'acc-fallback-2');
    expect(result).toEqual(fallbackAccount);
  });

  it('falls back to random in-memory paginated transactions for upstream 5xx', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const randomStub = createRandomStub();
    const fallbackResult = {
      items: [
        {
          id: 'txn-1',
          accountId: 'acc-1',
          userId: 'user-1',
          amount: -14.5,
          type: 'debit',
          description: 'Coffee',
          date: '2026-04-03T10:00:00.000Z',
        },
      ] as BankTransaction[],
      page: 2,
      limit: 10,
      total: 42,
    };
    randomStub.listTransactions.mockReturnValue(fallbackResult);

    const client = new MockBankClient(createConfigStub() as ConfigService, fetchMock, randomStub as unknown as RandomBankClient);

    const result = await client.listTransactions('user-1', 'acc-1', 2, 10);

    expect(randomStub.listTransactions).toHaveBeenCalledWith('user-1', 'acc-1', 2, 10);
    expect(result).toEqual(fallbackResult);
  });

  it('uses in-memory mode without calling upstream fetch', async () => {
    const fetchMock: FetchMock = jest.fn();
    const randomStub = createRandomStub();
    randomStub.listAccounts.mockReturnValue({ items: [] as BankAccount[] });

    const client = new MockBankClient(
      createConfigStub({ 'bank.upstreamMode': 'memory', 'bank.mockApiBaseUrl': '' }) as ConfigService,
      fetchMock,
      randomStub as unknown as RandomBankClient,
    );

    await client.listAccounts('user-1');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(randomStub.listAccounts).toHaveBeenCalledWith('user-1');
  });

  it('keeps mockapi mode strict and does not fallback', async () => {
    const fetchMock: FetchMock = jest.fn().mockRejectedValue(new Error('network down'));
    const randomStub = createRandomStub();

    const client = new MockBankClient(
      createConfigStub({ 'bank.upstreamMode': 'mockapi' }) as ConfigService,
      fetchMock,
      randomStub as unknown as RandomBankClient,
    );

    await expect(client.listAccounts('user-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(randomStub.listAccounts).not.toHaveBeenCalled();
  });

  it('does not fallback on upstream not-found responses', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValue(new Response('[]', { status: 404 }));
    const randomStub = createRandomStub();

    const client = new MockBankClient(createConfigStub() as ConfigService, fetchMock, randomStub as unknown as RandomBankClient);

    const execution = client.listAccounts('user-1');

    await expect(execution).rejects.toBeInstanceOf(HttpException);
    await expect(execution).rejects.toMatchObject({ status: 404 });
    expect(randomStub.listAccounts).not.toHaveBeenCalled();
  });

  it('returns deterministic random data for same user and paginates', () => {
    const randomClient = new RandomBankClient();

    const accountsFirst = randomClient.listAccounts('same-user');
    const accountsSecond = randomClient.listAccounts('same-user');

    expect(accountsSecond).toEqual(accountsFirst);
    expect(accountsFirst.items.length).toBeGreaterThan(0);

    const accountId = accountsFirst.items[0]?.id;
    if (!accountId) {
      throw new Error('Expected at least one generated account');
    }

    const firstPage = randomClient.listTransactions('same-user', accountId, 1, 5);
    const secondPage = randomClient.listTransactions('same-user', accountId, 2, 5);

    expect(firstPage.page).toBe(1);
    expect(firstPage.limit).toBe(5);
    expect(secondPage.page).toBe(2);
    expect(secondPage.limit).toBe(5);
    expect(firstPage.total).toBeDefined();
    expect((firstPage.total ?? 0) >= firstPage.items.length + secondPage.items.length).toBe(true);
  });

  it('returns ACCOUNT_NOT_FOUND in random fallback for unknown account id', () => {
    const randomClient = new RandomBankClient();

    expect(() => randomClient.getAccountById('user-1', 'missing-account')).toThrow(HttpException);
    expect(() => randomClient.getAccountById('user-1', 'missing-account')).toThrow(
      expect.objectContaining({
        response: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found',
        },
      }),
    );
  });

  it('does not throw when account has no generated transactions', async () => {
    const fetchMock: FetchMock = jest.fn().mockRejectedValue(new Error('downstream unavailable'));
    const randomStub = createRandomStub();
    randomStub.listTransactions.mockReturnValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    });

    const client = new MockBankClient(createConfigStub() as ConfigService, fetchMock, randomStub as unknown as RandomBankClient);

    const result = await client.listTransactions('user-1', 'acc-unknown', 1, 20);

    expect(result).toEqual({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    });
  });

  it('surfaces gateway timeout in mockapi mode', async () => {
    const fetchMock: FetchMock = jest.fn().mockRejectedValue(new DOMException('aborted', 'AbortError'));
    const randomStub = createRandomStub();
    const client = new MockBankClient(
      createConfigStub({ 'bank.upstreamMode': 'mockapi' }) as ConfigService,
      fetchMock,
      randomStub as unknown as RandomBankClient,
    );

    await expect(client.listAccounts('user-1')).rejects.toBeInstanceOf(GatewayTimeoutException);
  });
});
