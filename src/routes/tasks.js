const express = require('express');
const HttpError = require('../utils/HttpError');
const { createTask, updateTask, listQuery, parse } = require('../validation/task');

function createTasksRouter({ store, requireApiKey }) {
  const router = express.Router();

  const findOr404 = (id) => {
    const task = store.get(id);
    if (!task) throw new HttpError(404, 'NOT_FOUND', `Task ${id} not found`);
    return task;
  };

  router.get('/', (req, res) => {
    const { page, limit, status } = parse(listQuery, req.query);
    const { items, total } = store.list({ page, limit, status });
    res.json({ data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  });

  router.get('/:id', (req, res) => {
    res.json({ data: findOr404(req.params.id) });
  });

  router.post('/', requireApiKey, (req, res) => {
    const task = store.create(parse(createTask, req.body));
    res.status(201).location(`${req.baseUrl}/${task.id}`).json({ data: task });
  });

  router.patch('/:id', requireApiKey, (req, res) => {
    findOr404(req.params.id);
    const task = store.update(req.params.id, parse(updateTask, req.body));
    res.json({ data: task });
  });

  router.delete('/:id', requireApiKey, (req, res) => {
    findOr404(req.params.id);
    store.remove(req.params.id);
    res.status(204).end();
  });

  return router;
}

module.exports = createTasksRouter;
