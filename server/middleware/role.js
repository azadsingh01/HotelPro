import ApiError from '../utils/ApiError.js';

/** Allow a request only when its authenticated user's role is in the list. */
export function requireRole(...allowedRoles) {
  return function checkRole(request, _response, next) {
    if (!request.user) {
      return next(new ApiError(401, 'Authentication is required.'));
    }

    if (!allowedRoles.includes(request.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }

    return next();
  };
}
