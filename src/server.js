import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createInMemoryTaskRepository } from './modules/tasks/task.repository.js';
import { seedDemoTasks } from './modules/tasks/task.seed.js';
import { createLogger } from './shared/logger.js';

const SHUTDOWN_TIMEOUT_MS = 4_000;

async function main() {
  try {
    process.loadEnvFile();
  } catch {
    // no .env file, use the real environment
  }

  const config = loadConfig();
  const logger = createLogger(config);

  for (const event of ['unhandledRejection', 'uncaughtException']) {
    process.on(event, (err) => {
      logger.fatal({ err }, event);
      process.exit(1);
    });
  }

  const taskRepository = createInMemoryTaskRepository();
  await seedDemoTasks(taskRepository);

  const app = createApp({ config, logger, taskRepository });
  const server = app.listen(config.port, config.host, (err) => {
    if (err) {
      logger.fatal({ err }, 'server failed to start');
      process.exit(1);
    }
    logger.info({ host: config.host, port: config.port, env: config.env }, 'server listening');
  });

  // Longer than nginx's upstream keepalive_timeout (60s), so nginx never reuses
  // a connection that Node has just closed (which shows up as random 502s).
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
