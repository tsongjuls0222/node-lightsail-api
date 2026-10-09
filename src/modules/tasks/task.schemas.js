import { z } from 'zod';

export const TASK_STATUSES = ['todo', 'in_progress', 'done'];

const status = z.enum(TASK_STATUSES);

const title = z
  .string({ error: (issue) => (issue.input === undefined ? 'title is required' : 'title must be a string') })
  .trim()
  .min(1, 'title cannot be empty')
  .max(200, 'title must be at most 200 characters');

const description = z.string().trim().max(2000, 'description must be at most 2000 characters');

export const createTaskSchema = z.object({
  title,
  description: description.default(''),
  status: status.default('todo'),
});

// Separate from createTaskSchema on purpose: zod applies defaults even inside .partial(),
// which would silently reset status/description on every PATCH.
export const updateTaskSchema = z
  .object({ title, description, status })
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, { error: 'Provide at least one field to update' });

export const listTasksQuerySchema = z.object({
  status: status.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const taskIdParamsSchema = z.object({
  id: z.uuid({ error: 'id must be a valid UUID' }),
});
