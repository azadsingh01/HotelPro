import bcrypt from 'bcryptjs';
import ApiError from '../utils/ApiError.js';
import { verifyAdminSignupCode, hasAdminSignupCode } from '../utils/adminSignupCode.js';
import { createAccessToken } from '../utils/authToken.js';
import User from '../models/userModel.js';

const BCRYPT_ROUNDS = 10;
const dummyPasswordHashPromise = bcrypt.hash('hotelpro-invalid-login-dummy', BCRYPT_ROUNDS);
const userTypes = ['Ordinary', 'Admin'];

export function toPublicUser(user) {
  return {
    id: user.id ?? user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    userType: user.userType,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function createAuthResponse(user) {
  return { token: createAccessToken(user.id), user: toPublicUser(user) };
}

/** Create an Ordinary account or verify the server-side secret before creating Admin. */
export async function signup(request, response) {
  const { name, email, password, phone, userType, adminCode } = request.body;
  if (!userTypes.includes(userType)) throw new ApiError(400, 'Choose Ordinary or Admin as the user type.');
  if (userType === 'Admin') {
    if (!hasAdminSignupCode()) throw new ApiError(503, 'Admin signup is not configured. Contact an administrator.');
    if (!verifyAdminSignupCode(adminCode)) throw new ApiError(403, 'The Admin Secret Code is missing or incorrect.');
  }

  if (await User.exists({ email })) {
    throw new ApiError(400, 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ name, email, password: passwordHash, phone, userType });
  response.status(201).json({ message: 'User registered successfully.', ...createAuthResponse(user) });
}

async function authenticateWithType(email, password, requiredUserType) {
  const criteria = requiredUserType ? { email, userType: requiredUserType } : { email };
  const user = await User.findOne(criteria).select('+password');
  const passwordHash = user?.password ?? await dummyPasswordHashPromise;
  const passwordMatches = await bcrypt.compare(password, passwordHash);
  if (!user || !user.isActive || !passwordMatches) {
    throw new ApiError(401, 'Email or password is incorrect.');
  }
  return user;
}

/** Sign in either supported account type; the client redirects using user.userType. */
export async function login(request, response) {
  const user = await authenticateWithType(request.body.email, request.body.password);
  response.json({ message: 'Login successful.', ...createAuthResponse(user) });
}

/** Retained for the separate administrator login page. */
export async function adminLogin(request, response) {
  const user = await authenticateWithType(request.body.email, request.body.password, 'Admin');
  response.json({ message: 'Admin login successful.', ...createAuthResponse(user) });
}

export async function getProfile(request, response) {
  response.json({ user: toPublicUser(request.user) });
}
