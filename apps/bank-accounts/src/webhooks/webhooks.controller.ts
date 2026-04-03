import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import { GatewayTrustGuard } from '../security/gateway-trust.guard.js';
import { getTrustedUserId } from '../security/user-context.js';
import { CreateWebhookDto } from './dto/create-webhook.dto.js';
import { WebhookListResponseDto, WebhookResponseDto } from './dto/webhook-response.dto.js';
import { WebhooksService } from './webhooks.service.js';

type TrustedRequest = {
  trustedUser?: {
    userId: string;
  };
};

@ApiTags('webhooks')
@ApiBearerAuth('bearer')
@UseGuards(GatewayTrustGuard)
@Controller('webhooks')
export class WebhooksController {
  public constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({ summary: 'Create webhook for authenticated user' })
  @ApiCreatedResponse({ type: WebhookResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  public async create(
    @Req() request: TrustedRequest,
    @Body() dto: CreateWebhookDto,
  ): Promise<WebhookResponseDto> {
    const userId = getTrustedUserId(request);
    return this.webhooksService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List user webhooks' })
  @ApiOkResponse({ type: WebhookListResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  public async list(@Req() request: TrustedRequest): Promise<WebhookListResponseDto> {
    const userId = getTrustedUserId(request);
    return this.webhooksService.list(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete webhook owned by authenticated user' })
  @ApiNoContentResponse({ description: 'Webhook deleted' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  public async delete(@Req() request: TrustedRequest, @Param('id') webhookId: string): Promise<void> {
    const userId = getTrustedUserId(request);
    await this.webhooksService.delete(userId, webhookId);
  }
}
