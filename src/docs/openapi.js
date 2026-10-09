const { version } = require('../../package.json');

const errorSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'VALIDATION_ERROR' },
        message: { type: 'string', example: 'Validation failed' },
        details: {
          type: 'array',
          items: {
            type: 'object',
            properties: { field: { type: 'string' }, message: { type: 'string' } },
          },
        },
      },
    },
  },
};

const errorResponse = (description) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

const taskResponse = (description) => ({
  description,
  content: {
    'application/json': {
      schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Task' } } },
    },
  },
});

const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Node Lightsail API',
    version,
    description:
      'Node.js/Express REST API running on Amazon Lightsail behind NGINX, managed by PM2. ' +
      'GET endpoints are public; POST, PATCH and DELETE need an `X-API-Key` header.',
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'Health' }, { name: 'Tasks' }],
  components: {
    securitySchemes: {
      ApiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
    },
    schemas: {
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string', example: 'Deploy API to Lightsail' },
          description: { type: 'string', example: 'Ubuntu 24.04, PM2, NGINX reverse proxy' },
          status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      TaskInput: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', maxLength: 200, example: 'Add rate limiting' },
          description: { type: 'string', maxLength: 2000, example: 'NGINX limit_req, 10 req/s per IP' },
          status: { type: 'string', enum: ['todo', 'in_progress', 'done'], default: 'todo' },
        },
      },
      TaskUpdate: {
        type: 'object',
        description: 'Send at least one field.',
        properties: {
          title: { type: 'string', maxLength: 200 },
          description: { type: 'string', maxLength: 2000 },
          status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
        },
      },
      Error: errorSchema,
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Service health, version and uptime',
        responses: {
          200: {
            description: 'Service is up',
            content: {
              'application/json': {
                example: {
                  status: 'ok',
                  version,
                  node: 'v22.12.0',
                  uptimeSeconds: 3600,
                  memoryMb: 52,
                  timestamp: '2026-10-09T08:00:00.000Z',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List tasks (paginated, filterable by status)',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['todo', 'in_progress', 'done'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          200: {
            description: 'A page of tasks',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
                    meta: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        totalPages: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse('Invalid query parameters'),
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create a task',
        security: [{ ApiKey: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskInput' } } },
        },
        responses: {
          201: taskResponse('Task created'),
          400: errorResponse('Invalid body'),
          401: errorResponse('Missing or invalid API key'),
        },
      },
    },
    '/api/v1/tasks/{id}': {
      get: {
        tags: ['Tasks'],
        summary: 'Get one task',
        parameters: [idParam],
        responses: { 200: taskResponse('The task'), 404: errorResponse('Task not found') },
      },
      patch: {
        tags: ['Tasks'],
        summary: 'Update some fields of a task',
        security: [{ ApiKey: [] }],
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TaskUpdate' },
              example: { status: 'done' },
            },
          },
        },
        responses: {
          200: taskResponse('Updated task'),
          400: errorResponse('Invalid body'),
          401: errorResponse('Missing or invalid API key'),
          404: errorResponse('Task not found'),
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task',
        security: [{ ApiKey: [] }],
        parameters: [idParam],
        responses: {
          204: { description: 'Deleted' },
          401: errorResponse('Missing or invalid API key'),
          404: errorResponse('Task not found'),
        },
      },
    },
  },
};
