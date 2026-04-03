import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GatewayTrustGuard } from '../security/gateway-trust.guard.js';
import { GatewayTrustVerifierService } from '../security/gateway-trust-verifier.service.js';
import { WebhookEntity } from './webhook.entity.js';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([WebhookEntity])],
  controllers: [WebhooksController],
  providers: [WebhooksService, GatewayTrustVerifierService, GatewayTrustGuard],
})
export class WebhooksModule {}
