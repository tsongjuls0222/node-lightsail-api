const HttpError = require('../utils/HttpError');

function notFound(req, res, next) {
  next(new HttpError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`));
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.type === 'entity.parse.failed') {
    err = new HttpError(400, 'INVALID_JSON', 'Request body is not valid JSON');
  } else if (err.type === 'entity.too.large') {
    err = new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  }

  if (!(err instanceof HttpError)) {
    console.error(err);
    err = new HttpError(500, 'INTERNAL_ERROR', 'Something went wrong');
  }

  const body = { error: { code: err.code, message: err.message } };
  if (err.details) body.error.details = err.details;
  res.status(err.status).json(body);
}

module.exports = { notFound, errorHandler };
