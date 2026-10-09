import { once } from 'node:events';

import { createApp } from '../../src/app.js';
import { createInMemoryTaskRepository } from '../../src/modules/tasks/task.repository.js';
import { createLogger } from '../../src/shared/logger.js';

export const TEST_API_KEY = 'test-key';

export async function startTestServer() {
  const app = createApp({
    config: { apiKey: TEST_API_KEY },
    logger: createLogger({ logLevel: 'silent' }),
    taskRepository: createInMemoryTaskRepository(),
  });

  const server = app.listen(0);
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  return {
    request(method, path, { body, apiKey, headers = {} } = {}) {
      return fetch(baseUrl + path, {
        method,
        headers: {
          ...(body !== undefined && { 'Content-Type': 'application/json' }),
          ...(apiKey && { 'X-API-Key': apiKey }),
          ...headers,
        },
        body: body === undefined || typeof body === 'string' ? body : JSON.stringify(body),
      });
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
