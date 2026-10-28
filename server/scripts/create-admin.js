import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import '../config/env.js';
import { connectDB } from '../config/db.js';
import User from '../models/userModel.js';
import { getAdminCredentials } from '../utils/adminCredentials.js';

const BCRYPT_ROUNDS = 10;

async function createAdministrator() {
  const { name, email, password, phone } = getAdminCredentials();

  await connectDB();

  if (await User.exists({ email })) {
    throw new Error('An account with ADMIN_EMAIL already exists; no account was changed.');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const admin = await User.create({ name, email, password: passwordHash, phone, userType: 'Admin' });

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
