import { validationResult } from 'express-validator';
import ApiError from './ApiError.js';

/** Stop the request when one or more express-validator checks failed. */
export function validateRequest(request, _response, next) {
  const result = validationResult(request);

  if (result.isEmpty()) {
    return next();
  }

  const details = result.array().map((item) => ({
    field: item.path,
    message: item.msg,
  }));

  return next(new ApiError(400, 'The submitted data is invalid.', details));
}
