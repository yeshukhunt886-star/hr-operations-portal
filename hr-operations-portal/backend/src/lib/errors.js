export class HttpError extends Error {
  constructor(status, message, code, extras = {}) {
    super(message);
    this.status = status;
    this.code = code;
    Object.assign(this, extras);
  }
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError || err.status) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code || "ERROR"
    });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error", code: "INTERNAL" });
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
