const { randomUUID } = require('node:crypto');

function createTaskStore() {
  const tasks = new Map();

  return {
    list({ status, page, limit }) {
      let items = [...tasks.values()];
      if (status) items = items.filter((t) => t.status === status);
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const start = (page - 1) * limit;
      return { items: items.slice(start, start + limit), total: items.length };
    },

    get(id) {
      return tasks.get(id) || null;
    },

    create({ title, description = '', status = 'todo' }) {
      const now = new Date().toISOString();
      const task = { id: randomUUID(), title, description, status, createdAt: now, updatedAt: now };
      tasks.set(task.id, task);
      return task;
    },

    update(id, changes) {
      const task = tasks.get(id);
      if (!task) return null;
      const updated = { ...task, ...changes, updatedAt: new Date().toISOString() };
      tasks.set(id, updated);
      return updated;
    },

    remove(id) {
      return tasks.delete(id);
    },
  };
}

module.exports = { createTaskStore };
