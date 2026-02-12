const errorHandler = (err, req, res, next) => {
  console.error('Error:', err); // Log internally

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    message:
      process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Something went wrong!'
        : message,
  });
};

module.exports = errorHandler;
