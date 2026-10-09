import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().min(1).default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    API_KEY: z.string().optional(),
  })
  .refine((env) => env.NODE_ENV !== 'production' || (env.API_KEY?.length ?? 0) >= 32, {
    path: ['API_KEY'],
    error: 'API_KEY must be at least 32 characters in production',
  });

export function loadConfig(env = process.env) {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }

  const { NODE_ENV, HOST, PORT, LOG_LEVEL, API_KEY } = result.data;
  return Object.freeze({
    env: NODE_ENV,
    isProduction: NODE_ENV === 'production',
    host: HOST,
    port: PORT,
    logLevel: LOG_LEVEL,
    apiKey: API_KEY || 'dev-key',
  });
}
