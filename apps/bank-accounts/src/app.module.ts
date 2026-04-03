import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from './accounts/accounts.module.js';
import { bankConfiguration } from './config/configuration.js';
import { bankValidationSchema } from './config/schema.js';
import { HealthModule } from './health/health.module.js';
import { IntegrationsModule } from './integrations/integrations.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [bankConfiguration],
      validationSchema: bankValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        url: configService.getOrThrow<string>('bank.databaseUrl'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    IntegrationsModule,
    AccountsModule,
    WebhooksModule,
    HealthModule,
  ],
})
export class AppModule {}
