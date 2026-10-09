const express = require('express');
const { version } = require('../../package.json');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    version,
    node: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
