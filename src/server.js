const config = require('./config');
const createApp = require('./app');
const { createTaskStore } = require('./store/taskStore');

const store = createTaskStore();
store.create({ title: 'Update npm dependencies', status: 'done' });
store.create({ title: 'Review open pull requests', status: 'in_progress' });
store.create({ title: 'Move task store to MySQL', status: 'todo' });

const app = createApp({ store, apiKey: config.apiKey });

const server = app.listen(config.port, '127.0.0.1', () => {
  console.log(`API listening on http://127.0.0.1:${config.port} (${config.env})`);
});


function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 4_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
