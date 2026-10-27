/** Read and validate the one-time administrator credentials used by scripts. */
export function getAdminCredentials() {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || name.length < 2 || name.length > 80) {
    throw new Error('Set ADMIN_NAME to a name between 2 and 80 characters.');
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Set ADMIN_EMAIL to a valid email address.');
  }

  if (email === 'admin@example.com') {
    throw new Error('Replace the example ADMIN_EMAIL with an address you control.');
  }

  if (
    !password
    || Buffer.byteLength(password, 'utf8') < 12
    || Buffer.byteLength(password, 'utf8') > 72
    || password === 'replace-this-with-a-unique-admin-password'
  ) {
    throw new Error('Set ADMIN_PASSWORD to a unique value between 12 and 72 bytes.');
  }

  return { name, email, password };
}
