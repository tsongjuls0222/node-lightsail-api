import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';

const VALID_REQUEST_ID = /^[\w-]{1,64}$/;
const QUIET_PATHS = ['/health', '/docs'];

export function httpLogger(logger) {
  return pinoHttp({
    logger,
    genReqId(req, res) {
      const incoming = req.headers['x-request-id'];
      const id = typeof incoming === 'string' && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    autoLogging: {
      ignore: (req) => QUIET_PATHS.some((path) => req.url.startsWith(path)),
    },
    customLogLevel(req, res, err) {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url, ip: req.raw.ip }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  });
}
