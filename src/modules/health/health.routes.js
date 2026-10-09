import { Router } from 'express';
import pkg from '../../../package.json' with { type: 'json' };

export function createHealthRouter() {
  const router = Router();

  router.get('/', (req, res) => {
    res.json({
      status: 'ok',
      version: pkg.version,
      node: process.version,
      uptimeSeconds: Math.round(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
