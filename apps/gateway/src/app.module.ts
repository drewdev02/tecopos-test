import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { gatewayConfiguration } from './config/configuration.js';
import { gatewayValidationSchema } from './config/schema.js';
import { AuthController } from './proxy/auth.controller.js';
import { BankController } from './proxy/bank.controller.js';
import { GatewayProxyService } from './proxy/gateway-proxy.service.js';
import { HealthController } from './health/health.controller.js';
import { GatewayJwtGuard } from './security/gateway-jwt.guard.js';
import { InternalSignerService } from './security/internal-signer.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [gatewayConfiguration],
      validationSchema: gatewayValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const ttl = configService.getOrThrow<number>('gateway.throttling.ttlMs');
        const limit = configService.getOrThrow<number>('gateway.throttling.limit');
        return [{ ttl, limit }];
      },
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('gateway.jwtSecret'),
      }),
    }),
  ],
  controllers: [HealthController, AuthController, BankController],
  providers: [
    GatewayProxyService,
    InternalSignerService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: GatewayJwtGuard,
    },
  ],
})
export class AppModule {}
