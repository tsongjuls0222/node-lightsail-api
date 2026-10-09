import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, it } from 'node:test';

import { createInMemoryTaskRepository } from '../../src/modules/tasks/task.repository.js';
import { createTaskService } from '../../src/modules/tasks/task.service.js';
import { NotFoundError } from '../../src/shared/errors.js';

describe('taskService', () => {
  let service;
  beforeEach(() => {
    service = createTaskService({ taskRepository: createInMemoryTaskRepository() });
  });

  const newTask = (overrides = {}) =>
    service.create({ title: 'Task', description: '', status: 'todo', ...overrides });

  describe('create', () => {
    it('leaves completedAt empty for open tasks', async () => {
      const task = await newTask();
      assert.equal(task.completedAt, null);
    });

    it('sets completedAt for tasks created as done', async () => {
      const task = await newTask({ status: 'done' });
      assert.ok(Date.parse(task.completedAt));
    });
  });

  describe('update', () => {
    it('keeps completedAt when status does not change', async () => {
      const task = await newTask({ status: 'done' });
      const updated = await service.update(task.id, { title: 'Renamed', status: 'done' });
      assert.equal(updated.completedAt, task.completedAt);
    });

    it('clears completedAt when a done task is reopened', async () => {
      const task = await newTask({ status: 'done' });
      const updated = await service.update(task.id, { status: 'in_progress' });
      assert.equal(updated.completedAt, null);
    });

    it('throws NotFoundError for an unknown id', async () => {
      await assert.rejects(service.update(randomUUID(), { title: 'x' }), NotFoundError);
    });
  });

  describe('list', () => {
    it('returns pagination meta', async () => {
      for (const title of ['a', 'b', 'c']) await newTask({ title });
      const { items, meta } = await service.list({ page: 2, limit: 2 });
      assert.deepEqual(
        items.map((t) => t.title),
        ['a'],
      );
      assert.deepEqual(meta, { page: 2, limit: 2, total: 3, totalPages: 2 });
    });
  });

  describe('getById / remove', () => {
    it('throws NotFoundError for unknown ids', async () => {
      await assert.rejects(service.getById(randomUUID()), NotFoundError);
      await assert.rejects(service.remove(randomUUID()), NotFoundError);
    });

    it('removes an existing task', async () => {
      const task = await newTask();
      await service.remove(task.id);
      await assert.rejects(service.getById(task.id), NotFoundError);
    });
  });
});
