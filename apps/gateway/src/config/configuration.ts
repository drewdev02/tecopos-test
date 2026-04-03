import { registerAs } from '@nestjs/config';

export const gatewayConfiguration = registerAs('gateway', () => ({
  port: Number.parseInt(process.env['GATEWAY_PORT'] ?? '3000', 10),
  jwtSecret: process.env['JWT_SECRET'] ?? '',
  ssoServiceUrl: process.env['SSO_SERVICE_URL'] ?? process.env['GATEWAY_SSO_URL'] ?? '',
  bankServiceUrl: process.env['BANK_SERVICE_URL'] ?? process.env['GATEWAY_BANK_URL'] ?? '',
  internalSignatureSecret:
    process.env['INTERNAL_SIGNATURE_SECRET'] ?? process.env['GATEWAY_INTERNAL_HMAC_SECRET'] ?? '',
  internalSignatureMaxSkewSeconds: Number.parseInt(process.env['INTERNAL_SIGNATURE_MAX_SKEW_SECONDS'] ?? '90', 10),
  throttling: {
    ttlMs: Number.parseInt(process.env['GATEWAY_RATE_LIMIT_TTL_MS'] ?? '60000', 10),
    limit: Number.parseInt(process.env['GATEWAY_RATE_LIMIT_LIMIT'] ?? '100', 10),
  },
}));
