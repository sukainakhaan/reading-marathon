/**
 * Wraps an async route handler so thrown errors are forwarded to Express's
 * error handler instead of crashing the process or hanging the request.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Throws a plain object error that the central error handler turns into
 * a proper HTTP response. Use like: throw new HttpError(404, 'Not found');
 */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Returns true if every key in `fields` is present and non-empty on `body`. */
function requireFields(body, fields) {
  const missing = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length) {
    throw new HttpError(400, `Missing required field(s): ${missing.join(', ')}`);
  }
}

module.exports = { asyncHandler, HttpError, requireFields };
