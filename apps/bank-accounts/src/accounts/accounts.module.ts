import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module.js';
import { GatewayTrustGuard } from '../security/gateway-trust.guard.js';
import { GatewayTrustVerifierService } from '../security/gateway-trust-verifier.service.js';
import { AccountsController } from './accounts.controller.js';
import { AccountsService } from './accounts.service.js';

@Module({
  imports: [IntegrationsModule],
  controllers: [AccountsController],
  providers: [AccountsService, GatewayTrustVerifierService, GatewayTrustGuard],
})
export class AccountsModule {}
