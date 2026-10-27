import ApiError from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/authToken.js';
import User from '../models/User.js';

/** Require a valid bearer token and load its current user record. */
export async function authenticate(request, _response, next) {
  const authorization = request.get('authorization');
  const [scheme, token, extraPart] = authorization?.trim().split(/\s+/) ?? [];

  if (scheme?.toLowerCase() !== 'bearer' || !token || extraPart) {
    return next(new ApiError(401, 'A valid bearer token is required.'));
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(new ApiError(401, 'The access token is invalid or has expired.'));
  }

  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    return next(new ApiError(401, 'The access token is invalid.'));
  }

  const user = await User.findById(payload.sub);

  if (!user || !user.isActive) {
    return next(new ApiError(401, 'The access token is invalid or the account is inactive.'));
  }

  request.user = user;
  return next();
}
