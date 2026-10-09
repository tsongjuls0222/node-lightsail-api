import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.js';
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamsSchema,
  updateTaskSchema,
} from './task.schemas.js';

export function createTaskRouter({ taskController, requireApiKey }) {
  const router = Router();

  router.get('/', validate({ query: listTasksQuerySchema }), taskController.list);
  router.get('/:id', validate({ params: taskIdParamsSchema }), taskController.getById);
  router.post('/', requireApiKey, validate({ body: createTaskSchema }), taskController.create);
  router.patch(
    '/:id',
    requireApiKey,
    validate({ params: taskIdParamsSchema, body: updateTaskSchema }),
    taskController.update,
  );
  router.delete('/:id', requireApiKey, validate({ params: taskIdParamsSchema }), taskController.remove);

  return router;
}
