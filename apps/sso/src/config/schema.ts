import Joi from 'joi';

export const ssoValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  SSO_PORT: Joi.number().integer().min(1).max(65535).default(3001),
  SSO_DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
  JWT_SECRET: Joi.string().min(16).optional(),
  SSO_BCRYPT_ROUNDS: Joi.number().integer().min(10).max(14).default(10),
  SSO_AUTH_RATE_LIMIT_TTL_MS: Joi.number().integer().min(1_000).max(300_000).default(60_000),
  SSO_AUTH_RATE_LIMIT_LIMIT: Joi.number().integer().min(1).max(100).default(5),

  // Legacy compatibility alias
  SSO_JWT_SECRET: Joi.string().min(16).optional(),
}).or('JWT_SECRET', 'SSO_JWT_SECRET')
  .unknown(true);
