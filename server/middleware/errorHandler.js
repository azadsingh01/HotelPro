import { unlink } from 'node:fs/promises';

/** Send a consistent JSON response for errors that reach Express. */
export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  for (const file of Array.isArray(request.files) ? request.files : []) {
    if (file.path) void unlink(file.path).catch(() => {});
  }

  if (error.code === 11000) {
    const isDuplicateEmail = Boolean(error.keyPattern?.email || error.keyValue?.email);
    return response.status(isDuplicateEmail ? 400 : 409).json({
      success: false,
      message: isDuplicateEmail ? 'An account with this email already exists.' : 'A record with that value already exists.',
      data: null,
    });
  }

  if (error.name === 'MulterError') {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Each uploaded image must be 2 MB or smaller.'
      : error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE'
        ? 'Upload up to 5 image files using the photos field.'
        : 'The uploaded files are invalid.';
    return response.status(400).json({ success: false, message, data: null });
  }

  if (error.name === 'ValidationError') {
    const details = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));

    return response.status(400).json({
      success: false,
      message: 'The submitted data is invalid.',
      data: { details },
    });
  }

  const statusCode = Number.isInteger(error.statusCode)
    ? error.statusCode
    : Number.isInteger(error.status)
      ? error.status
      : 500;

  const responseBody = {
    success: false,
    message: statusCode >= 500 ? 'An unexpected server error occurred.' : error.message,
    data: null,
  };

  if (Array.isArray(error.details)) {
    responseBody.data = { details: error.details };
  }

  return response.status(statusCode).json(responseBody);
}
