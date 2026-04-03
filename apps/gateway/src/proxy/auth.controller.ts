import { Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../security/public.decorator.js';
import { GatewayProxyService } from './gateway-proxy.service.js';

type ProxyRequest = {
  method: string;
  originalUrl: string;
  url: string;
  headers: Record<string, string | undefined>;
  body?: unknown;
};

@ApiTags('auth-proxy')
@Controller('auth')
export class AuthController {
  public constructor(private readonly proxyService: GatewayProxyService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Proxy register to SSO service' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 },
      },
    },
  })
  @ApiOkResponse({ description: 'Proxied response from SSO register endpoint' })
  public async register(@Req() request: ProxyRequest): Promise<unknown> {
    const result = await this.proxyService.forwardToSso({
      method: request.method,
      path: this.buildProxyPath(request),
      headers: request.headers,
      body: request.body,
    });

    return result.body;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Proxy login to SSO service' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
      },
    },
  })
  @ApiOkResponse({ description: 'Proxied response from SSO login endpoint' })
  public async login(@Req() request: ProxyRequest): Promise<unknown> {
    const result = await this.proxyService.forwardToSso({
      method: request.method,
      path: this.buildProxyPath(request),
      headers: request.headers,
      body: request.body,
    });

    return result.body;
  }

  private buildProxyPath(request: ProxyRequest): string {
    return request.originalUrl || request.url;
  }
}
