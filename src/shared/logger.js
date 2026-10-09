import pino from 'pino';

export function createLogger({ logLevel }) {
  return pino({
    level: logLevel,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  });
}
