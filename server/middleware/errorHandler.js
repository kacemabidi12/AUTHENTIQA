// Central error handler middleware
// Catches errors passed via next(err) and returns a JSON response.
module.exports = function errorHandler(err, req, res, next) {
  // Log full error in non-production for debugging
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({ error: message });
};
