import bcrypt from 'bcryptjs';
import ApiError from '../utils/ApiError.js';
import { createAccessToken } from '../utils/authToken.js';
import User from '../models/User.js';

const BCRYPT_ROUNDS = 12;
const dummyPasswordHashPromise = bcrypt.hash('hotelpro-invalid-login-dummy', BCRYPT_ROUNDS);

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? null,
    address: user.address ?? null,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function createAuthResponse(user) {
  return {
    token: createAccessToken(user.id),
    user: toPublicUser(user),
  };
}

/** Register a guest account. Public registration never sets a privileged role. */
export async function register(request, response) {
  const { name, email, password, phone } = request.body;
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await User.create({
    name,
    email,
    password: passwordHash,
    phone,
    role: 'guest',
  });

  response.status(201).json({
    message: 'Account created successfully.',
    ...createAuthResponse(user),
  });
}

/** Authenticate a user with email and password. */
export async function login(request, response) {
  const { email, password } = request.body;
  const user = await User.findOne({ email }).select('+password');
  const passwordHash = user?.password ?? await dummyPasswordHashPromise;
  const passwordMatches = await bcrypt.compare(password, passwordHash);

  if (!user || !user.isActive || !passwordMatches) {
    throw new ApiError(401, 'Email or password is incorrect.');
  }

  response.json({
    message: 'Login successful.',
    ...createAuthResponse(user),
  });
}

/** Return the authenticated user's safe profile fields. */
export async function getProfile(request, response) {
  response.json({ user: toPublicUser(request.user) });
}
