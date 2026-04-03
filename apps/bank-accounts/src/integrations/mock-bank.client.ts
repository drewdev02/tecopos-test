import {
  GatewayTimeoutException,
  HttpException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RandomBankClient } from './random-bank.client.js';
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

export const FETCH_CLIENT = Symbol('FETCH_CLIENT');

type FetchClient = typeof fetch;

const DEFAULT_TIMEOUT_MS = 2_000;
type UpstreamMode = 'mockapi' | 'hybrid' | 'memory';

@Injectable()
export class MockBankClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly upstreamMode: UpstreamMode;

  public constructor(
    configService: ConfigService,
    @Inject(FETCH_CLIENT) private readonly fetchClient: FetchClient,
    private readonly randomBankClient: RandomBankClient,
  ) {
    this.upstreamMode = (configService.get<UpstreamMode>('bank.upstreamMode') ?? 'hybrid') as UpstreamMode;
    this.baseUrl =
      this.upstreamMode === 'memory' ? (configService.get<string>('bank.mockApiBaseUrl') ?? '') : configService.getOrThrow<string>('bank.mockApiBaseUrl');
    this.timeoutMs = configService.get<number>('bank.mockApiTimeoutMs') ?? DEFAULT_TIMEOUT_MS;
  }

  public async listAccounts(userId: string): Promise<AccountsResponse> {
    if (this.upstreamMode === 'memory') {
      return this.randomBankClient.listAccounts(userId);
    }

    try {
      const response = await this.fetchJson<BankAccount[]>(`accounts?userId=${encodeURIComponent(userId)}`);
      return { items: response };
    } catch (error) {
      if (this.shouldUseFallback(error)) {
        return this.randomBankClient.listAccounts(userId);
      }

      throw error;
    }
  }

  public async getAccountById(userId: string, accountId: string): Promise<BankAccount> {
    if (this.upstreamMode === 'memory') {
      return this.randomBankClient.getAccountById(userId, accountId);
    }

    let response: BankAccount[];

    try {
      response = await this.fetchJson<BankAccount[]>(
        `accounts?id=${encodeURIComponent(accountId)}&userId=${encodeURIComponent(userId)}`,
      );
    } catch (error) {
      if (this.shouldUseFallback(error)) {
        return this.randomBankClient.getAccountById(userId, accountId);
      }

      throw error;
    }

    const account = response[0];
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

  public async listTransactions(
    userId: string,
    accountId: string,
    page: number,
    limit: number,
  ): Promise<TransactionsResponse> {
    if (this.upstreamMode === 'memory') {
      return this.randomBankClient.listTransactions(userId, accountId, page, limit);
    }

    const normalizedPage = Math.max(page, 1);
    const normalizedLimit = Math.min(Math.max(limit, 1), 100);
    const offset = (normalizedPage - 1) * normalizedLimit;

    const baseQuery = `transactions?accountId=${encodeURIComponent(accountId)}&userId=${encodeURIComponent(userId)}`;

    try {
      const [items, total] = await Promise.all([
        this.fetchJson<BankTransaction[]>(`${baseQuery}&_start=${offset}&_limit=${normalizedLimit}`),
        this.fetchCount(baseQuery),
      ]);

      return {
        items,
        page: normalizedPage,
        limit: normalizedLimit,
        total,
      };
    } catch (error) {
      if (this.shouldUseFallback(error)) {
        return this.randomBankClient.listTransactions(userId, accountId, page, limit);
      }

      throw error;
    }
  }

  private shouldUseFallback(error: unknown): boolean {
    if (this.upstreamMode !== 'hybrid') {
      return false;
    }

    if (!(error instanceof HttpException)) {
      return false;
    }

    const status = error.getStatus();
    return status === 503 || status === 504;
  }

  private async fetchCount(path: string): Promise<number | undefined> {
    const url = this.buildUrl(path);
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    try {
      const response = await this.fetchClient(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      const total = response.headers.get('x-total-count');
      if (!total) {
        return undefined;
      }

      const parsed = Number.parseInt(total, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const url = this.buildUrl(path);
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    try {
      const response = await this.fetchClient(url, {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        this.handleUpstreamHttpError(response.status);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new GatewayTimeoutException({
          code: 'BANK_UPSTREAM_TIMEOUT',
          message: 'Bank upstream request timed out',
        });
      }

      throw new ServiceUnavailableException({
        code: 'BANK_DEPENDENCY_UNAVAILABLE',
        message: 'Unable to reach banking upstream dependency',
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private handleUpstreamHttpError(statusCode: number): never {
    if (statusCode === 404) {
      throw new HttpException(
        {
          code: 'BANK_RESOURCE_NOT_FOUND',
          message: 'Bank upstream resource was not found',
        },
        404,
      );
    }

    if (statusCode >= 500) {
      throw new HttpException(
        {
          code: 'BANK_DEPENDENCY_UNAVAILABLE',
          message: 'Bank upstream dependency failed',
        },
        503,
      );
    }

    throw new HttpException(
      {
        code: 'BANK_UPSTREAM_ERROR',
        message: 'Bank upstream returned an error',
      },
      502,
    );
  }

  private buildUrl(path: string): string {
    const normalizedBase = this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`;
    return new URL(path, normalizedBase).toString();
  }
}
