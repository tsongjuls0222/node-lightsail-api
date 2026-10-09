const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const createApp = require('../src/app');
const { createTaskStore } = require('../src/store/taskStore');

const API_KEY = 'test-key';
let server;
let baseUrl;

before(async () => {
  const app = createApp({ store: createTaskStore(), apiKey: API_KEY, logRequests: false });
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

function request(method, path, { body, key } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (key) headers['X-API-Key'] = key;
  return fetch(baseUrl + path, {
    method,
    headers,
    body: typeof body === 'string' ? body : body && JSON.stringify(body),
  });
}

describe('GET /health', () => {
  it('reports status, version and uptime', async () => {
    const res = await request('GET', '/health');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(typeof body.version, 'string');
    assert.equal(typeof body.uptimeSeconds, 'number');
  });
});

describe('Tasks API', () => {
  let taskId;

  it('rejects writes without an API key', async () => {
    const res = await request('POST', '/api/v1/tasks', { body: { title: 'x' } });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error.code, 'UNAUTHORIZED');
  });

  it('rejects writes with a wrong API key', async () => {
    const res = await request('POST', '/api/v1/tasks', { body: { title: 'x' }, key: 'wrong' });
    assert.equal(res.status, 401);
  });

  it('creates a task', async () => {
    const res = await request('POST', '/api/v1/tasks', {
      body: { title: '  Deploy to Lightsail  ', description: 'PM2 + NGINX' },
      key: API_KEY,
    });
    assert.equal(res.status, 201);
    const { data } = await res.json();
    assert.equal(data.title, 'Deploy to Lightsail');
    assert.equal(data.status, 'todo');
    assert.ok(res.headers.get('location').endsWith(`/api/v1/tasks/${data.id}`));
    taskId = data.id;
  });

  it('validates the body', async () => {
    const res = await request('POST', '/api/v1/tasks', { body: { title: '', status: 'nope' }, key: API_KEY });
    assert.equal(res.status, 400);
    const { error } = await res.json();
    assert.equal(error.code, 'VALIDATION_ERROR');
    assert.deepEqual(error.details.map((d) => d.field), ['title', 'status']);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request('POST', '/api/v1/tasks', { body: '{"title":', key: API_KEY });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, 'INVALID_JSON');
  });

  it('gets a task by id', async () => {
    const res = await request('GET', `/api/v1/tasks/${taskId}`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).data.id, taskId);
  });

  it('lists tasks with pagination and status filter', async () => {
    await request('POST', '/api/v1/tasks', { body: { title: 'Second', status: 'done' }, key: API_KEY });

    const all = await (await request('GET', '/api/v1/tasks?limit=1')).json();
    assert.equal(all.data.length, 1);
    assert.deepEqual(all.meta, { page: 1, limit: 1, total: 2, totalPages: 2 });

    const done = await (await request('GET', '/api/v1/tasks?status=done')).json();
    assert.equal(done.meta.total, 1);
    assert.equal(done.data[0].title, 'Second');
  });

  it('rejects invalid query parameters', async () => {
    const res = await request('GET', '/api/v1/tasks?limit=500');
    assert.equal(res.status, 400);
  });

  it('updates a task', async () => {
    const res = await request('PATCH', `/api/v1/tasks/${taskId}`, { body: { status: 'done' }, key: API_KEY });
    assert.equal(res.status, 200);
    const { data } = await res.json();
    assert.equal(data.status, 'done');
    assert.equal(data.title, 'Deploy to Lightsail');
  });

  it('rejects an empty update', async () => {
    const res = await request('PATCH', `/api/v1/tasks/${taskId}`, { body: {}, key: API_KEY });
    assert.equal(res.status, 400);
  });

  it('deletes a task', async () => {
    const res = await request('DELETE', `/api/v1/tasks/${taskId}`, { key: API_KEY });
    assert.equal(res.status, 204);
    const gone = await request('GET', `/api/v1/tasks/${taskId}`);
    assert.equal(gone.status, 404);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request('GET', '/api/v1/nope');
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, 'NOT_FOUND');
  });
});

describe('GET /docs', () => {
  it('serves the Swagger UI', async () => {
    const res = await request('GET', '/docs/');
    assert.equal(res.status, 200);
    assert.match(await res.text(), /swagger-ui/i);
  });

  it('works over plain http (no upgrade-insecure-requests)', async () => {
    const res = await request('GET', '/docs/');
    assert.doesNotMatch(res.headers.get('content-security-policy'), /upgrade-insecure-requests/);
  });
});
