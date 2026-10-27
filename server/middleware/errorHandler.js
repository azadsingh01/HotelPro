/** Send a consistent JSON response for errors that reach Express. */
export function errorHandler(error, _request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  if (error.code === 11000) {
    return response.status(409).json({ message: 'A record with that value already exists.' });
  }

  if (error.name === 'ValidationError') {
    const details = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));

    return response.status(400).json({ message: 'The submitted data is invalid.', details });
  }

  const statusCode = Number.isInteger(error.statusCode)
    ? error.statusCode
    : Number.isInteger(error.status)
      ? error.status
      : 500;

  const responseBody = {
    message: statusCode >= 500 ? 'An unexpected server error occurred.' : error.message,
  };

  if (Array.isArray(error.details)) {
    responseBody.details = error.details;
  }

  return response.status(statusCode).json(responseBody);
}
