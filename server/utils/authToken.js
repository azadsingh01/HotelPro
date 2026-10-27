import jwt from 'jsonwebtoken';
import ApiError from './ApiError.js';

const TOKEN_ALGORITHM = 'HS256';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (
    !secret
    || Buffer.byteLength(secret, 'utf8') < 32
    || secret === 'replace-this-with-a-long-random-secret'
  ) {
    throw new ApiError(500, 'Set JWT_SECRET to a unique random value of at least 32 bytes.');
  }

  return secret;
}

/** Fail during startup when access tokens cannot be signed safely. */
export function validateJwtConfiguration() {
  const secret = getJwtSecret();

  try {
    jwt.sign(
      { sub: 'hotelpro-configuration-check' },
      secret,
      {
        algorithm: TOKEN_ALGORITHM,
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
      },
    );
  } catch {
    throw new ApiError(500, 'Set JWT_EXPIRES_IN to a valid jsonwebtoken duration.');
  }
}

/** Create a signed access token for a persisted user. */
export function createAccessToken(userId) {
  return jwt.sign(
    { sub: userId.toString() },
    getJwtSecret(),
    {
      algorithm: TOKEN_ALGORITHM,
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
  );
}

/** Verify a token using only the algorithm used when signing it. */
export function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret(), { algorithms: [TOKEN_ALGORITHM] });
}
