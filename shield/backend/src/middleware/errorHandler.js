export function errorHandler(err, req, res, _next) {
  console.error('[ErrorHandler]', err);

  // Only allow valid 4xx/5xx status codes
  const status =
    Number.isInteger(err.status) && err.status >= 400 && err.status < 600
      ? err.status
      : 500;

  const isProduction = process.env.NODE_ENV === 'production';

  res.status(status).json({
    success: false,
    error: isProduction && status === 500
      ? 'Internal server error'
      : err.message || 'Internal server error',

    ...(isProduction
      ? {}
      : {
        stack: err.stack,
      }),
  });
}