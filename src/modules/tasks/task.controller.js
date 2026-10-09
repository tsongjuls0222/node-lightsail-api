export function createTaskController({ taskService }) {
  return {
    async list(req, res) {
      const { items, meta } = await taskService.list(req.validated.query);
      res.json({ data: items, meta });
    },

    async getById(req, res) {
      const task = await taskService.getById(req.validated.params.id);
      res.json({ data: task });
    },

    async create(req, res) {
      const task = await taskService.create(req.validated.body);
      res.status(201).location(`${req.baseUrl}/${task.id}`).json({ data: task });
    },

    async update(req, res) {
      const task = await taskService.update(req.validated.params.id, req.validated.body);
      res.json({ data: task });
    },

    async remove(req, res) {
      await taskService.remove(req.validated.params.id);
      res.status(204).end();
    },
  };
}
