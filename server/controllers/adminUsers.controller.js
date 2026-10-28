import User from '../models/userModel.js';
import { toPublicUser } from './auth.controller.js';

export async function getAllUsers(request, response) {
  const page = Number(request.query.page) || 1;
  const limit = Number(request.query.limit) || 50;
  const users = await User.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
  const total = await User.countDocuments();
  response.json({ users: users.map(toPublicUser), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}
