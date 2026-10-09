import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { startTestServer, TEST_API_KEY } from '../helpers/testServer.js';

describe('Tasks API', () => {
  let api;
  beforeEach(async () => {
    api = await startTestServer();
  });
  afterEach(() => api.close());

  async function createTask(body) {
    const res = await api.request('POST', '/api/v1/tasks', { body, apiKey: TEST_API_KEY });
    assert.equal(res.status, 201);
    return (await res.json()).data;
  }

  describe('auth', () => {
    it('rejects writes without an API key', async () => {
      const res = await api.request('POST', '/api/v1/tasks', { body: { title: 'x' } });
      assert.equal(res.status, 401);
      assert.equal((await res.json()).error.code, 'UNAUTHORIZED');
    });

    it('rejects writes with a wrong API key', async () => {
      const res = await api.request('POST', '/api/v1/tasks', { body: { title: 'x' }, apiKey: 'wrong' });
      assert.equal(res.status, 401);
    });

    it('allows reads without an API key', async () => {
      const res = await api.request('GET', '/api/v1/tasks');
      assert.equal(res.status, 200);
    });
  });

  describe('POST /api/v1/tasks', () => {
    it('creates a task with defaults and a Location header', async () => {
      const res = await api.request('POST', '/api/v1/tasks', {
        body: { title: '  Deploy to Lightsail  ' },
        apiKey: TEST_API_KEY,
      });
      assert.equal(res.status, 201);
      const { data } = await res.json();
      assert.equal(data.title, 'Deploy to Lightsail');
      assert.equal(data.description, '');
      assert.equal(data.status, 'todo');
      assert.equal(data.completedAt, null);
      assert.equal(res.headers.get('location'), `/api/v1/tasks/${data.id}`);
    });

    it('sets completedAt when a task is created as done', async () => {
      const task = await createTask({ title: 'Already done', status: 'done' });
      assert.ok(Date.parse(task.completedAt));
    });

    it('returns field-level validation errors', async () => {
      const res = await api.request('POST', '/api/v1/tasks', {
        body: { title: '', status: 'nope' },
        apiKey: TEST_API_KEY,
      });
      assert.equal(res.status, 400);
      const { error } = await res.json();
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.deepEqual(
        error.details.map((d) => `${d.location}.${d.field}`),
        ['body.title', 'body.status'],
      );
    });

    it('returns 400 for malformed JSON', async () => {
      const res = await api.request('POST', '/api/v1/tasks', { body: '{"title":', apiKey: TEST_API_KEY });
      assert.equal(res.status, 400);
      assert.equal((await res.json()).error.code, 'INVALID_JSON');
    });

    it('returns 413 for oversized bodies', async () => {
      const res = await api.request('POST', '/api/v1/tasks', {
        body: { title: 'x'.repeat(200 * 1024) },
        apiKey: TEST_API_KEY,
      });
      assert.equal(res.status, 413);
      assert.equal((await res.json()).error.code, 'PAYLOAD_TOO_LARGE');
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('lists newest first with pagination meta', async () => {
      await createTask({ title: 'First' });
      await createTask({ title: 'Second' });

      const res = await api.request('GET', '/api/v1/tasks?limit=1');
      const body = await res.json();
      assert.equal(body.data[0].title, 'Second');
      assert.deepEqual(body.meta, { page: 1, limit: 1, total: 2, totalPages: 2 });
    });

    it('filters by status', async () => {
      await createTask({ title: 'Open' });
      await createTask({ title: 'Closed', status: 'done' });

      const body = await (await api.request('GET', '/api/v1/tasks?status=done')).json();
      assert.deepEqual(
        body.data.map((t) => t.title),
        ['Closed'],
      );
    });

    it('rejects invalid query parameters', async () => {
      const res = await api.request('GET', '/api/v1/tasks?limit=500&page=0');
      assert.equal(res.status, 400);
      const { error } = await res.json();
      assert.deepEqual(error.details.map((d) => d.field).sort(), ['limit', 'page']);
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('returns the task', async () => {
      const task = await createTask({ title: 'Find me' });
      const res = await api.request('GET', `/api/v1/tasks/${task.id}`);
      assert.equal(res.status, 200);
      assert.deepEqual((await res.json()).data, task);
    });

    it('returns 400 for an id that is not a UUID', async () => {
      const res = await api.request('GET', '/api/v1/tasks/not-a-uuid');
      assert.equal(res.status, 400);
      assert.equal((await res.json()).error.details[0].location, 'params');
    });

    it('returns 404 for an unknown id', async () => {
      const res = await api.request('GET', `/api/v1/tasks/${randomUUID()}`);
      assert.equal(res.status, 404);
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('updates only the fields sent', async () => {
      const task = await createTask({ title: 'Original', description: 'keep me', status: 'in_progress' });
      const res = await api.request('PATCH', `/api/v1/tasks/${task.id}`, {
        body: { title: 'Renamed' },
        apiKey: TEST_API_KEY,
      });
      assert.equal(res.status, 200);
      const { data } = await res.json();
      assert.equal(data.title, 'Renamed');
      assert.equal(data.description, 'keep me');
      assert.equal(data.status, 'in_progress');
    });

    it('sets completedAt when status becomes done and clears it when reopened', async () => {
      const task = await createTask({ title: 'Ship it' });
      const patch = (body) =>
        api
          .request('PATCH', `/api/v1/tasks/${task.id}`, { body, apiKey: TEST_API_KEY })
          .then((r) => r.json());

      const done = (await patch({ status: 'done' })).data;
      assert.ok(Date.parse(done.completedAt));

      const reopened = (await patch({ status: 'todo' })).data;
      assert.equal(reopened.completedAt, null);
    });

    it('rejects an empty update', async () => {
      const task = await createTask({ title: 'Untouched' });
      const res = await api.request('PATCH', `/api/v1/tasks/${task.id}`, { body: {}, apiKey: TEST_API_KEY });
      assert.equal(res.status, 400);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await api.request('PATCH', `/api/v1/tasks/${randomUUID()}`, {
        body: { title: 'x' },
        apiKey: TEST_API_KEY,
      });
      assert.equal(res.status, 404);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('deletes the task', async () => {
      const task = await createTask({ title: 'Delete me' });
      const res = await api.request('DELETE', `/api/v1/tasks/${task.id}`, { apiKey: TEST_API_KEY });
      assert.equal(res.status, 204);
      assert.equal((await api.request('GET', `/api/v1/tasks/${task.id}`)).status, 404);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await api.request('DELETE', `/api/v1/tasks/${randomUUID()}`, { apiKey: TEST_API_KEY });
      assert.equal(res.status, 404);
    });
  });
});
