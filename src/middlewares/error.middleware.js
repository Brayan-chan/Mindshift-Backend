export class ApiError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function notFound(req, res, next) {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
}

export function errorHandler(error, req, res, _next) {
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    data: null,
    error: {
      code,
      message: error.message || 'Unexpected server error',
      request_id: req.id || null,
      retryable: statusCode >= 500,
      details: error.details || undefined,
    },
  });
}
