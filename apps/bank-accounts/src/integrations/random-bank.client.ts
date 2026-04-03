import { HttpException, Injectable } from '@nestjs/common';
import type { BankAccount, BankTransaction } from './types/bank-account.types.js';

type AccountsResponse = {
  items: BankAccount[];
};

type TransactionsResponse = {
  items: BankTransaction[];
  page: number;
  limit: number;
  total?: number;
};

type UserBankData = {
  accounts: BankAccount[];
  transactionsByAccountId: Map<string, BankTransaction[]>;
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD'] as const;
const CREDIT_DESCRIPTIONS = ['Payroll', 'Transfer in', 'Cashback', 'Refund', 'Interest'];
const DEBIT_DESCRIPTIONS = ['Groceries', 'Restaurant', 'Transport', 'Utilities', 'Online purchase'];
const BASE_TIMESTAMP = Date.parse('2026-01-01T00:00:00.000Z');

@Injectable()
export class RandomBankClient {
  private readonly users = new Map<string, UserBankData>();

  public listAccounts(userId: string): AccountsResponse {
    const userData = this.getOrCreateUserData(userId);
    return { items: userData.accounts };
  }

  public getAccountById(userId: string, accountId: string): BankAccount {
    const userData = this.getOrCreateUserData(userId);
    const account = userData.accounts.find((candidate) => candidate.id === accountId);

    if (!account) {
      throw new HttpException(
        {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found',
        },
        404,
      );
    }

    return account;
  }

  public listTransactions(userId: string, accountId: string, page: number, limit: number): TransactionsResponse {
    const userData = this.getOrCreateUserData(userId);
    const allTransactions = userData.transactionsByAccountId.get(accountId) ?? [];

    const normalizedPage = Math.max(page, 1);
    const normalizedLimit = Math.min(Math.max(limit, 1), 100);
    const offset = (normalizedPage - 1) * normalizedLimit;

    return {
      items: allTransactions.slice(offset, offset + normalizedLimit),
      page: normalizedPage,
      limit: normalizedLimit,
      total: allTransactions.length,
    };
  }

  private getOrCreateUserData(userId: string): UserBankData {
    const existing = this.users.get(userId);
    if (existing) {
      return existing;
    }

    const created = this.buildUserData(userId);
    this.users.set(userId, created);
    return created;
  }

  private buildUserData(userId: string): UserBankData {
    const seed = this.hash(userId);
    const rng = this.createRng(seed);
    const userHash = seed.toString(36);
    const accountCount = 2 + Math.floor(rng() * 4);

    const accounts: BankAccount[] = [];
    const transactionsByAccountId = new Map<string, BankTransaction[]>();

    for (let index = 0; index < accountCount; index += 1) {
      const accountId = `acc-${userHash}-${index + 1}`;
      const currency = CURRENCIES[Math.floor(rng() * CURRENCIES.length)] ?? 'USD';
      const account: BankAccount = {
        id: accountId,
        userId,
        name: `Account ${index + 1}`,
        accountNumber: this.generateAccountNumber(rng),
        balance: this.roundToTwo(500 + rng() * 40_000),
        currency,
      };

      accounts.push(account);
      transactionsByAccountId.set(accountId, this.buildTransactionsForAccount(userId, accountId, rng));
    }

    return {
      accounts,
      transactionsByAccountId,
    };
  }

  private buildTransactionsForAccount(userId: string, accountId: string, rng: () => number): BankTransaction[] {
    const transactionCount = 24 + Math.floor(rng() * 57);
    const transactions: BankTransaction[] = [];

    for (let index = 0; index < transactionCount; index += 1) {
      const isCredit = rng() > 0.5;
      const amountMagnitude = this.roundToTwo(5 + rng() * 3_000);
      const type = isCredit ? 'credit' : 'debit';
      const descriptions = isCredit ? CREDIT_DESCRIPTIONS : DEBIT_DESCRIPTIONS;
      const description = descriptions[Math.floor(rng() * descriptions.length)] ?? 'Transaction';
      const dayOffset = Math.floor(rng() * 180);
      const minuteOffset = Math.floor(rng() * 24 * 60);
      const timestamp = BASE_TIMESTAMP - (dayOffset * 24 * 60 + minuteOffset) * 60 * 1000 - index * 90_000;

      transactions.push({
        id: `${accountId}-txn-${index + 1}`,
        accountId,
        userId,
        amount: isCredit ? amountMagnitude : -amountMagnitude,
        type,
        description,
        date: new Date(timestamp).toISOString(),
      });
    }

    transactions.sort((left, right) => (left.date < right.date ? 1 : -1));
    return transactions;
  }

  private generateAccountNumber(rng: () => number): string {
    let value = '';
    for (let index = 0; index < 10; index += 1) {
      value += Math.floor(rng() * 10).toString();
    }
    return value;
  }

  private hash(input: string): number {
    let hash = 2_166_136_261;

    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16_777_619);
    }

    return hash >>> 0;
  }

  private createRng(seed: number): () => number {
    let state = seed;

    return () => {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
    };
  }

  private roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
