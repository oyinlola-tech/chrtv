function errorHandler(error, _req, res, _next) {
  const status = error.statusCode || error.status || 500;

  if (error.isAxiosError) {
    const upstreamStatus = error.response?.status || 502;
    return res.status(upstreamStatus).json({
      error: 'Upstream service request failed',
    });
  }

  if (status >= 500) {
    console.error(error);
  }

  return res.status(status).json({
    error: status >= 500 ? 'Internal server error' : error.message,
  });
}

module.exports = errorHandler;

