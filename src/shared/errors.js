export class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL_ERROR', details, cause } = {}) {
    super(message, { cause });
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(details, message = 'Validation failed') {
    super(message, { status: 400, code: 'VALIDATION_ERROR', details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Missing or invalid X-API-Key header') {
    super(message, { status: 401, code: 'UNAUTHORIZED' });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, { status: 404, code: 'NOT_FOUND' });
  }
}
