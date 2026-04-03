import { registerAs } from '@nestjs/config';

export const ssoConfiguration = registerAs('sso', () => ({
  port: Number.parseInt(process.env['SSO_PORT'] ?? '3001', 10),
  databaseUrl: process.env['SSO_DATABASE_URL'] ?? '',
  jwtSecret: process.env['JWT_SECRET'] ?? process.env['SSO_JWT_SECRET'] ?? '',
  bcryptRounds: Number.parseInt(process.env['SSO_BCRYPT_ROUNDS'] ?? '10', 10),
  throttling: {
    ttlMs: Number.parseInt(process.env['SSO_AUTH_RATE_LIMIT_TTL_MS'] ?? '60000', 10),
    limit: Number.parseInt(process.env['SSO_AUTH_RATE_LIMIT_LIMIT'] ?? '5', 10),
  },
}));
