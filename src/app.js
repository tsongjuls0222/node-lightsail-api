import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { openapi } from './docs/openapi.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import { createTaskController } from './modules/tasks/task.controller.js';
import { createTaskRouter } from './modules/tasks/task.routes.js';
import { createTaskService } from './modules/tasks/task.service.js';
import { errorHandler, notFoundHandler } from './shared/middleware/errorHandler.js';
import { httpLogger } from './shared/middleware/httpLogger.js';
import { requireApiKey } from './shared/middleware/requireApiKey.js';

export function createApp({ config, logger, taskRepository }) {
  const taskService = createTaskService({ taskRepository });
  const taskController = createTaskController({ taskService });

  const app = express();

  app.set('trust proxy', 1); // nginx in front, so req.ip is the real client
  app.disable('x-powered-by');

  app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }));
  app.use(httpLogger(logger));
  app.use(express.json({ limit: '100kb' }));

  app.get('/', (req, res) => res.redirect('/docs'));
  app.use('/health', createHealthRouter());
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'Node Lightsail API' }));
  app.use('/api/v1/tasks', createTaskRouter({ taskController, requireApiKey: requireApiKey(config.apiKey) }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
