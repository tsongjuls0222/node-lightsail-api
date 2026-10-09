import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  it('applies development defaults', () => {
    const config = loadConfig({});
    assert.deepEqual(config, {
      env: 'development',
      isProduction: false,
      host: '127.0.0.1',
      port: 3000,
      logLevel: 'info',
      apiKey: 'dev-key',
    });
  });

  it('coerces PORT from a string', () => {
    assert.equal(loadConfig({ PORT: '8080' }).port, 8080);
  });

  it('rejects an invalid PORT', () => {
    assert.throws(() => loadConfig({ PORT: 'abc' }), /PORT/);
  });

  it('requires a strong API_KEY in production', () => {
    assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /API_KEY/);
    assert.throws(() => loadConfig({ NODE_ENV: 'production', API_KEY: 'short' }), /API_KEY/);
  });

  it('accepts a production config with a 32+ character API_KEY', () => {
    const apiKey = 'a'.repeat(64);
    const config = loadConfig({ NODE_ENV: 'production', API_KEY: apiKey });
    assert.equal(config.isProduction, true);
    assert.equal(config.apiKey, apiKey);
  });
});
