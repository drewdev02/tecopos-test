import Joi from 'joi';

export const gatewayValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  GATEWAY_PORT: Joi.number().integer().min(1).max(65535).default(3000),
  JWT_SECRET: Joi.string().min(16).required(),
  SSO_SERVICE_URL: Joi.string().uri({ scheme: ['http', 'https'] }).optional(),
  BANK_SERVICE_URL: Joi.string().uri({ scheme: ['http', 'https'] }).optional(),
  INTERNAL_SIGNATURE_SECRET: Joi.string().min(16).optional(),
  INTERNAL_SIGNATURE_MAX_SKEW_SECONDS: Joi.number().integer().min(30).max(300).default(90),
  GATEWAY_RATE_LIMIT_TTL_MS: Joi.number().integer().min(1_000).max(300_000).default(60_000),
  GATEWAY_RATE_LIMIT_LIMIT: Joi.number().integer().min(1).max(10_000).default(100),

  // Legacy compatibility aliases
  GATEWAY_SSO_URL: Joi.string().uri({ scheme: ['http', 'https'] }).optional(),
  GATEWAY_BANK_URL: Joi.string().uri({ scheme: ['http', 'https'] }).optional(),
  GATEWAY_INTERNAL_HMAC_SECRET: Joi.string().min(16).optional(),
})
  .or('SSO_SERVICE_URL', 'GATEWAY_SSO_URL')
  .or('BANK_SERVICE_URL', 'GATEWAY_BANK_URL')
  .or('INTERNAL_SIGNATURE_SECRET', 'GATEWAY_INTERNAL_HMAC_SECRET')
  .unknown(true);
