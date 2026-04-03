import { Controller, Delete, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GatewayProxyService } from './gateway-proxy.service.js';

type ProxyRequest = {
  method: string;
  originalUrl: string;
  url: string;
  headers: Record<string, string | undefined>;
  body?: unknown;
  user: {
    userId: string;
  };
};

@ApiTags('banking-proxy')
@ApiBearerAuth('bearer')
@Controller()
export class BankController {
  public constructor(private readonly proxyService: GatewayProxyService) {}

  @Get('accounts')
  @ApiOperation({ summary: 'Proxy account list to bank-accounts service' })
  @ApiOkResponse({ description: 'Proxied response from bank service' })
  public async listAccounts(@Req() request: ProxyRequest): Promise<unknown> {
    const result = await this.proxyService.forwardToBank({
      method: request.method,
      path: this.buildProxyPath(request),
      headers: request.headers,
      userId: request.user.userId,
    });

    return result.body;
  }

  @Get('accounts/:id')
  @ApiOperation({ summary: 'Proxy account details to bank-accounts service' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiOkResponse({ description: 'Proxied response from bank service' })
  public async getAccount(@Req() request: ProxyRequest): Promise<unknown> {
    const result = await this.proxyService.forwardToBank({
      method: request.method,
      path: this.buildProxyPath(request),
      headers: request.headers,
      userId: request.user.userId,
    });

    return result.body;
  }

  @Get('accounts/:id/transactions')
  @ApiOperation({ summary: 'Proxy account transactions to bank-accounts service' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (min 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Page size (1-100)' })
  @ApiOkResponse({ description: 'Proxied response from bank service' })
  public async getTransactions(@Req() request: ProxyRequest): Promise<unknown> {
    const result = await this.proxyService.forwardToBank({
      method: request.method,
      path: this.buildProxyPath(request),
      headers: request.headers,
      userId: request.user.userId,
    });

    return result.body;
  }

  @Post('webhooks')
  @ApiOperation({ summary: 'Proxy webhook creation to bank-accounts service' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['url', 'event'],
      properties: {
        url: { type: 'string', format: 'uri' },
        event: { type: 'string', enum: ['transaction.created', 'balance.updated'] },
      },
    },
  })
  @ApiOkResponse({ description: 'Proxied response from bank service' })
  public async createWebhook(@Req() request: ProxyRequest): Promise<unknown> {
    const result = await this.proxyService.forwardToBank({
      method: request.method,
      path: this.buildProxyPath(request),
      headers: request.headers,
      body: request.body,
      userId: request.user.userId,
    });

    return result.body;
  }

  @Get('webhooks')
  @ApiOperation({ summary: 'Proxy webhook list to bank-accounts service' })
  @ApiOkResponse({ description: 'Proxied response from bank service' })
  public async listWebhooks(@Req() request: ProxyRequest): Promise<unknown> {
    const result = await this.proxyService.forwardToBank({
      method: request.method,
      path: this.buildProxyPath(request),
      headers: request.headers,
      userId: request.user.userId,
    });

    return result.body;
  }

  @Delete('webhooks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Proxy webhook deletion to bank-accounts service' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  public async deleteWebhook(@Req() request: ProxyRequest): Promise<void> {
    await this.proxyService.forwardToBank({
      method: request.method,
      path: this.buildProxyPath(request),
      headers: request.headers,
      userId: request.user.userId,
    });
  }

  private buildProxyPath(request: ProxyRequest): string {
    return request.originalUrl || request.url;
  }
}
