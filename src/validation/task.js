const { z } = require('zod');
const HttpError = require('../utils/HttpError');

const status = z.enum(['todo', 'in_progress', 'done']);

const createTask = z.object({
  title: z.string({ error: 'title is required' }).trim().min(1, 'title is required').max(200),
  description: z.string().trim().max(2000).optional(),
  status: status.optional(),
});

const updateTask = createTask
  .partial()
  .refine((body) => Object.keys(body).length > 0, { error: 'send at least one of: title, description, status' });

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: status.optional(),
});

function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || null,
      message: issue.message,
    }));
    throw new HttpError(400, 'VALIDATION_ERROR', 'Validation failed', details);
  }
  return result.data;
}

module.exports = { createTask, updateTask, listQuery, parse };
