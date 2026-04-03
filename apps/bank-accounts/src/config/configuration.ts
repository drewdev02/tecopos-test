import { registerAs } from '@nestjs/config';

export const bankConfiguration = registerAs('bank', () => ({
  port: Number.parseInt(process.env['BANK_PORT'] ?? '3002', 10),
  databaseUrl: process.env['BANK_DATABASE_URL'] ?? '',
  mockApiBaseUrl: process.env['MOCKAPI_BASE_URL'] ?? process.env['BANK_MOCKAPI_BASE_URL'] ?? '',
  mockApiTimeoutMs: Number.parseInt(process.env['MOCKAPI_TIMEOUT_MS'] ?? '2000', 10),
  upstreamMode: process.env['BANK_UPSTREAM_MODE'] ?? 'hybrid',
  internalSignatureSecret:
    process.env['INTERNAL_SIGNATURE_SECRET'] ?? process.env['BANK_INTERNAL_HMAC_SECRET'] ?? '',
  internalSignatureMaxSkewSeconds: Number.parseInt(
    process.env['INTERNAL_SIGNATURE_MAX_SKEW_SECONDS'] ?? process.env['BANK_INTERNAL_SIGNATURE_MAX_SKEW_SECONDS'] ?? '90',
    10,
  ),
}));
