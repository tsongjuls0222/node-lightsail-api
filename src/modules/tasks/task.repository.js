import { randomUUID } from 'node:crypto';

// In-memory implementation. The methods are async so a MySQL repository with the
// same interface can replace this one without touching the service or controller.
export function createInMemoryTaskRepository() {
  const tasks = new Map();

  return {
    async findMany({ status, limit, offset }) {
      const matching = [...tasks.values()].filter((task) => !status || task.status === status).reverse();
      return { items: matching.slice(offset, offset + limit), total: matching.length };
    },

    async findById(id) {
      return tasks.get(id) ?? null;
    },

    async create(data) {
      const now = new Date().toISOString();
      const task = { id: randomUUID(), ...data, createdAt: now, updatedAt: now };
      tasks.set(task.id, task);
      return task;
    },

    async update(id, changes) {
      const task = tasks.get(id);
      if (!task) return null;
      const updated = { ...task, ...changes, updatedAt: new Date().toISOString() };
      tasks.set(id, updated);
      return updated;
    },

    async delete(id) {
      return tasks.delete(id);
    },
  };
}
