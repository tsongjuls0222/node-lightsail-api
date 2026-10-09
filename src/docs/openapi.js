import pkg from '../../package.json' with { type: 'json' };
import { TASK_STATUSES } from '../modules/tasks/task.schemas.js';

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const jsonContent = (schema) => ({ 'application/json': { schema } });
const errorResponse = (description) => ({ description, content: jsonContent(ref('Error')) });
const taskResponse = (description) => ({
  description,
  content: jsonContent({ type: 'object', properties: { data: ref('Task') } }),
});

const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
const requiresApiKey = [{ ApiKey: [] }];

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Node Lightsail API',
    version: pkg.version,
    description:
      'Express REST API running on AWS Lightsail behind NGINX, managed by PM2. ' +
      'GET endpoints are public; POST, PATCH and DELETE need an `X-API-Key` header. ' +
      'Every response has an `X-Request-Id` header, which is also included in error bodies.',
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
          title: { type: 'string', example: 'Review open pull requests' },
          description: { type: 'string', example: '' },
          status: { type: 'string', enum: TASK_STATUSES },
          completedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Set when status becomes done, cleared when it changes back',
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateTask: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', maxLength: 200, example: 'Add rate limiting' },
          description: { type: 'string', maxLength: 2000, default: '' },
          status: { type: 'string', enum: TASK_STATUSES, default: 'todo' },
        },
      },
      UpdateTask: {
        type: 'object',
        minProperties: 1,
        properties: {
          title: { type: 'string', maxLength: 200 },
          description: { type: 'string', maxLength: 2000 },
          status: { type: 'string', enum: TASK_STATUSES },
        },
      },
      PageMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 3 },
          totalPages: { type: 'integer', example: 1 },
        },
      },
      Error: {
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
                  properties: {
                    location: { type: 'string', enum: ['body', 'query', 'params'] },
                    field: { type: 'string', example: 'title' },
                    message: { type: 'string', example: 'title is required' },
                  },
                },
              },
              requestId: { type: 'string', example: '0b8a4f0e-4f5e-4a5b-9a77-2c1d3e4f5a6b' },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Service status, version and uptime',
        responses: {
          200: {
            description: 'Service is up',
            content: {
              'application/json': {
                example: {
                  status: 'ok',
                  version: pkg.version,
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
        summary: 'List tasks, newest first',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: TASK_STATUSES } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          200: {
            description: 'A page of tasks',
            content: jsonContent({
              type: 'object',
              properties: { data: { type: 'array', items: ref('Task') }, meta: ref('PageMeta') },
            }),
          },
          400: errorResponse('Invalid query parameters'),
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create a task',
        security: requiresApiKey,
        requestBody: { required: true, content: jsonContent(ref('CreateTask')) },
        responses: {
          201: taskResponse('Task created; the Location header points to it'),
          400: errorResponse('Invalid body'),
          401: errorResponse('Missing or invalid API key'),
        },
      },
    },
    '/api/v1/tasks/{id}': {
      get: {
        tags: ['Tasks'],
        summary: 'Get a task',
        parameters: [idParam],
        responses: {
          200: taskResponse('The task'),
          400: errorResponse('id is not a valid UUID'),
          404: errorResponse('Task not found'),
        },
      },
      patch: {
        tags: ['Tasks'],
        summary: 'Update some fields of a task',
        security: requiresApiKey,
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: ref('UpdateTask'), example: { status: 'done' } } },
        },
        responses: {
          200: taskResponse('Updated task'),
          400: errorResponse('Invalid id or body'),
          401: errorResponse('Missing or invalid API key'),
          404: errorResponse('Task not found'),
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task',
        security: requiresApiKey,
        parameters: [idParam],
        responses: {
          204: { description: 'Deleted' },
          400: errorResponse('id is not a valid UUID'),
          401: errorResponse('Missing or invalid API key'),
          404: errorResponse('Task not found'),
        },
      },
    },
  },
};
