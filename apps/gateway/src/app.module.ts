import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import Joi from 'joi';
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
      validationSchema: Joi.object({
        GATEWAY_PORT: Joi.number().default(3000),
        JWT_SECRET: Joi.string().min(16).required(),
        SSO_SERVICE_URL: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
        BANK_SERVICE_URL: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
        INTERNAL_SIGNATURE_SECRET: Joi.string().min(16).required(),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
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
