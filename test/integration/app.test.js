import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { startTestServer } from '../helpers/testServer.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('app', () => {
  let api;
  before(async () => {
    api = await startTestServer();
  });
  after(() => api.close());

  it('GET /health reports status and version', async () => {
    const res = await api.request('GET', '/health');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.match(body.version, /^\d+\.\d+\.\d+$/);
  });

  it('serves the API docs', async () => {
    const res = await api.request('GET', '/docs/');
    assert.equal(res.status, 200);
    assert.match(await res.text(), /swagger-ui/i);
  });

  describe('content security policy', () => {
    it('makes browsers upgrade insecure requests in production', async () => {
      const prod = await startTestServer({ isProduction: true });
      try {
        const res = await prod.request('GET', '/docs/');
        assert.match(res.headers.get('content-security-policy'), /upgrade-insecure-requests/);
      } finally {
        await prod.close();
      }
    });

    it('leaves it off in development so /docs works over plain http', async () => {
      const res = await api.request('GET', '/docs/');
      assert.doesNotMatch(res.headers.get('content-security-policy'), /upgrade-insecure-requests/);
    });
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await api.request('GET', '/api/v1/nope');
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, 'NOT_FOUND');
  });

  describe('request ids', () => {
    it('generates one when the client sends none', async () => {
      const res = await api.request('GET', '/health');
      assert.match(res.headers.get('x-request-id'), UUID);
    });

    it('reuses a valid incoming X-Request-Id and includes it in error bodies', async () => {
      const res = await api.request('GET', '/api/v1/nope', { headers: { 'X-Request-Id': 'trace-123' } });
      assert.equal(res.headers.get('x-request-id'), 'trace-123');
      assert.equal((await res.json()).error.requestId, 'trace-123');
    });

    it('replaces an invalid incoming X-Request-Id', async () => {
      const res = await api.request('GET', '/health', { headers: { 'X-Request-Id': 'bad id with spaces' } });
      assert.match(res.headers.get('x-request-id'), UUID);
    });
  });
});
