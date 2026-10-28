import { timingSafeEqual } from 'node:crypto';

export function hasAdminSignupCode() {
  const configured = process.env.ADMIN_SIGNUP_CODE;
  return typeof configured === 'string' && configured.length > 0 && !/^replace[-_]/i.test(configured);
}

export function verifyAdminSignupCode(candidate) {
  const configured = process.env.ADMIN_SIGNUP_CODE;
  if (typeof configured !== 'string' || /^replace[-_]/i.test(configured) || typeof candidate !== 'string') return false;
  const expectedBytes = Buffer.from(configured, 'utf8');
  const candidateBytes = Buffer.from(candidate, 'utf8');
  return expectedBytes.length === candidateBytes.length && timingSafeEqual(expectedBytes, candidateBytes);
}
