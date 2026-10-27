import ApiError from '../utils/ApiError.js';

/** Route unmatched requests through the shared JSON error handler. */
export function notFound(_request, _response, next) {
  next(new ApiError(404, 'API route not found.'));
}
