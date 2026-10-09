try {
  process.loadEnvFile();
} catch {
  // no .env file, use the real environment
}

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

const apiKey = process.env.API_KEY || (isProduction ? '' : 'dev-key');
if (!apiKey) {
  throw new Error('API_KEY must be set in production. See .env.example.');
}

module.exports = {
  env,
  isProduction,
  port: Number(process.env.PORT) || 3000,
  apiKey,
};
