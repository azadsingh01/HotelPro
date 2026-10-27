import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import '../config/env.js';
import { connectDatabase } from '../config/database.js';
import User from '../models/User.js';
import { getAdminCredentials } from '../utils/adminCredentials.js';

const BCRYPT_ROUNDS = 12;

async function createAdministrator() {
  const { name, email, password } = getAdminCredentials();

  await connectDatabase();

  if (await User.exists({ email })) {
    throw new Error('An account with ADMIN_EMAIL already exists; no account was changed.');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const admin = await User.create({ name, email, password: passwordHash, role: 'admin' });

  console.log(`Administrator account created: ${admin.email}`);
}

try {
  await createAdministrator();
} catch (error) {
  console.error('Could not create the administrator account:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
