/** Read and validate the one-time administrator credentials used by scripts. */
export function getAdminCredentials() {
  const name = process.env.ADMIN_NAME?.trim() || 'HotelPro Admin';
  const email = (process.env.ADMIN_EMAIL?.trim() || 'admin@hotelpro.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const phone = process.env.ADMIN_PHONE?.trim() || '14155550100';

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

  if (!/^\d{10,15}$/.test(phone)) throw new Error('ADMIN_PHONE must contain 10 to 15 digits.');

  return { name, email, password, phone };
}
