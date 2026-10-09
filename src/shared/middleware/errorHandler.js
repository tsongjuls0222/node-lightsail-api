import { AppError, NotFoundError } from '../errors.js';

export function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const error = toAppError(err);
  // pino-http logs res.err with the stack trace on the request's log line
  if (error.status >= 500) res.err = err;

  res.status(error.status).json({
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
      requestId: req.id,
    },
  });
}

function toAppError(err) {
  if (err instanceof AppError) return err;
  if (err?.type === 'entity.parse.failed') {
    return new AppError('Request body is not valid JSON', { status: 400, code: 'INVALID_JSON' });
  }
  if (err?.type === 'entity.too.large') {
    return new AppError('Request body is too large', { status: 413, code: 'PAYLOAD_TOO_LARGE' });
  }
  return new AppError('Something went wrong');
}
