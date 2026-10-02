export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const payload = {
    error: status >= 500 ? "Internal server error" : err.message,
  };
  if (status < 500 && err.details) {
    payload.details = err.details;
  }
  res.status(status).json(payload);
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
