import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import Joi from 'joi';
import { AccountsModule } from './accounts/accounts.module.js';
import { IntegrationsModule } from './integrations/integrations.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';

@Controller()
class HealthController {
  @Get('/health')
  public health(): { status: string; service: string } {
    return {
      status: 'ok',
      service: 'bank-accounts',
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        BANK_PORT: Joi.number().default(3002),
        BANK_DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
        MOCKAPI_BASE_URL: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
        MOCKAPI_TIMEOUT_MS: Joi.number().integer().min(500).max(30_000).default(2_000),
        INTERNAL_SIGNATURE_SECRET: Joi.string().min(16).required(),
        INTERNAL_SIGNATURE_MAX_SKEW_SECONDS: Joi.number().integer().min(60).max(120).default(90),
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        url: configService.getOrThrow<string>('BANK_DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    IntegrationsModule,
    AccountsModule,
    WebhooksModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
