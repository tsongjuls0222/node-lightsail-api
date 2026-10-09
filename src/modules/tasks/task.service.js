import { NotFoundError } from '../../shared/errors.js';

const taskNotFound = (id) => new NotFoundError(`Task ${id} not found`);
const completedAtFor = (status) => (status === 'done' ? new Date().toISOString() : null);

export function createTaskService({ taskRepository }) {
  async function getById(id) {
    const task = await taskRepository.findById(id);
    if (!task) throw taskNotFound(id);
    return task;
  }

  return {
    getById,

    async list({ status, page, limit }) {
      const { items, total } = await taskRepository.findMany({ status, limit, offset: (page - 1) * limit });
      return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    },

    async create({ title, description, status }) {
      return taskRepository.create({ title, description, status, completedAt: completedAtFor(status) });
    },

    async update(id, changes) {
      const current = await getById(id);
      const patch = { ...changes };
      if (changes.status && changes.status !== current.status) {
        patch.completedAt = completedAtFor(changes.status);
      }

      const updated = await taskRepository.update(id, patch);
      if (!updated) throw taskNotFound(id);
      return updated;
    },

    async remove(id) {
      const deleted = await taskRepository.delete(id);
      if (!deleted) throw taskNotFound(id);
    },
  };
}
