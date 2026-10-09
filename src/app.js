const express = require('express');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const openapi = require('./docs/openapi');
const healthRouter = require('./routes/health');
const createTasksRouter = require('./routes/tasks');
const requireApiKey = require('./middleware/apiKey');
const requestLogger = require('./middleware/requestLogger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp({ store, apiKey, logRequests = true }) {
  const app = express();

  app.set('trust proxy', 1); // nginx in front, so req.ip is the real client
  app.disable('x-powered-by');

  app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }));
  if (logRequests) app.use(requestLogger);
  app.use(express.json({ limit: '100kb' }));

  app.get('/', (req, res) => res.redirect('/docs'));
  app.use('/health', healthRouter);
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'Node Lightsail API' }));
  app.use('/api/v1/tasks', createTasksRouter({ store, requireApiKey: requireApiKey(apiKey) }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
