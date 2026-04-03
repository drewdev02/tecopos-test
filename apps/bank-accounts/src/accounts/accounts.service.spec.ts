import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { AccountsService } from './accounts.service.js';
import { MockBankClient } from '../integrations/mock-bank.client.js';
import type { BankAccount, BankTransaction } from '../integrations/types/bank-account.types.js';

type MockBankClientMock = {
  listAccounts: jest.Mock;
  getAccountById: jest.Mock;
  listTransactions: jest.Mock;
};

describe('AccountsService', () => {
  let service: AccountsService;
  let mockBankClient: MockBankClientMock;

  beforeEach(() => {
    mockBankClient = {
      listAccounts: jest.fn(),
      getAccountById: jest.fn(),
      listTransactions: jest.fn(),
    };

    service = new AccountsService(mockBankClient as unknown as MockBankClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns account list from upstream mock client', async () => {
    const upstreamResult = {
      items: [
        {
          id: 'acc-1',
          userId: 'user-1',
          name: 'Main account',
          accountNumber: '12345678',
          balance: 4500,
          currency: 'USD',
        },
      ] as BankAccount[],
    };
    mockBankClient.listAccounts.mockResolvedValue(upstreamResult);

    const result = await service.listAccounts('user-1');

    expect(mockBankClient.listAccounts).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(upstreamResult);
  });

  it('returns account by id from upstream mock client', async () => {
    const account: BankAccount = {
      id: 'acc-2',
      userId: 'user-1',
      name: 'Savings',
      accountNumber: '87654321',
      balance: 9900,
      currency: 'USD',
    };
    mockBankClient.getAccountById.mockResolvedValue(account);

    const result = await service.getAccountById('user-1', 'acc-2');

    expect(mockBankClient.getAccountById).toHaveBeenCalledWith('user-1', 'acc-2');
    expect(result).toEqual(account);
  });

  it('propagates not found mapping when account does not exist', async () => {
    const notFoundError = new HttpException(
      {
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Account not found',
      },
      404,
    );
    mockBankClient.getAccountById.mockRejectedValue(notFoundError);

    const execution = service.getAccountById('user-1', 'missing-id');

    await expect(execution).rejects.toBeInstanceOf(HttpException);
    await expect(execution).rejects.toMatchObject({
      status: 404,
      response: {
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Account not found',
      },
    });
  });

  it('passes transactions pagination values (page, limit) and returns upstream payload', async () => {
    const upstreamResult = {
      items: [
        {
          id: 'txn-1',
          accountId: 'acc-1',
          userId: 'user-1',
          amount: -25,
          type: 'debit',
          description: 'Coffee shop',
          date: '2026-04-03T09:00:00.000Z',
        },
      ] as BankTransaction[],
      page: 2,
      limit: 10,
      total: 31,
    };

    mockBankClient.listTransactions.mockResolvedValue(upstreamResult);

    const result = await service.listTransactions('user-1', 'acc-1', 2, 10);

    expect(mockBankClient.listTransactions).toHaveBeenCalledWith('user-1', 'acc-1', 2, 10);
    expect(result).toEqual(upstreamResult);
  });

  it('propagates upstream dependency errors', async () => {
    const upstreamError = new ServiceUnavailableException({
      code: 'BANK_DEPENDENCY_UNAVAILABLE',
      message: 'Unable to reach banking upstream dependency',
    });
    mockBankClient.listAccounts.mockRejectedValue(upstreamError);

    const execution = service.listAccounts('user-1');

    await expect(execution).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(execution).rejects.toMatchObject({
      status: 503,
      response: {
        code: 'BANK_DEPENDENCY_UNAVAILABLE',
        message: 'Unable to reach banking upstream dependency',
      },
    });
  });
});
