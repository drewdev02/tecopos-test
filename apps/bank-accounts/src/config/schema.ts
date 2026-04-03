import Joi from 'joi';

export const bankValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  BANK_PORT: Joi.number().integer().min(1).max(65535).default(3002),
  BANK_DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
  MOCKAPI_BASE_URL: Joi.string().uri({ scheme: ['http', 'https'] }).optional(),
  MOCKAPI_TIMEOUT_MS: Joi.number().integer().min(500).max(30_000).default(2_000),
  INTERNAL_SIGNATURE_SECRET: Joi.string().min(16).optional(),
  INTERNAL_SIGNATURE_MAX_SKEW_SECONDS: Joi.number().integer().min(30).max(300).default(90),

  // Legacy compatibility aliases
  BANK_MOCKAPI_BASE_URL: Joi.string().uri({ scheme: ['http', 'https'] }).optional(),
  BANK_INTERNAL_HMAC_SECRET: Joi.string().min(16).optional(),
  BANK_INTERNAL_SIGNATURE_MAX_SKEW_SECONDS: Joi.number().integer().min(30).max(300).optional(),
})
  .or('MOCKAPI_BASE_URL', 'BANK_MOCKAPI_BASE_URL')
  .or('INTERNAL_SIGNATURE_SECRET', 'BANK_INTERNAL_HMAC_SECRET')
  .unknown(true);
