import { Injectable } from '@nestjs/common';
import { MockBankClient } from '../integrations/mock-bank.client.js';
import type { BankAccount, BankTransaction } from '../integrations/types/bank-account.types.js';

export type AccountsListResponse = {
  items: BankAccount[];
};

export type TransactionsListResponse = {
  items: BankTransaction[];
  page: number;
  limit: number;
  total?: number;
};

@Injectable()
export class AccountsService {
  public constructor(private readonly mockBankClient: MockBankClient) {}

  public async listAccounts(userId: string): Promise<AccountsListResponse> {
    return this.mockBankClient.listAccounts(userId);
  }

  public async getAccountById(userId: string, accountId: string): Promise<BankAccount> {
    return this.mockBankClient.getAccountById(userId, accountId);
  }

  public async listTransactions(
    userId: string,
    accountId: string,
    page: number,
    limit: number,
  ): Promise<TransactionsListResponse> {
    return this.mockBankClient.listTransactions(userId, accountId, page, limit);
  }
}
