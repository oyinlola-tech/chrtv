function errorHandler(error, _req, res, _next) {
  const status = error.statusCode || error.status || 500;

  if (error.isAxiosError) {
    const upstreamStatus = error.response?.status || 502;
    const upstreamError = error.response?.data?.error || 'Upstream service request failed';
    return res.status(upstreamStatus).json({
      error: upstreamError,
    });
  }

  if (status >= 500) {
    console.error('[ERROR]', error.message, error.stack);
  }

  // Avoid leaking stack traces in production responses
  const message = (status >= 500 && !error.expose)
    ? 'Internal server error'
    : (error.message || 'Request failed');

  return res.status(status).json({
    error: message,
  });
}

module.exports = errorHandler;
