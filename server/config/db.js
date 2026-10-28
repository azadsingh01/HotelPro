import mongoose from 'mongoose';
import Booking from '../models/bookingModel.js';
import Room from '../models/roomModel.js';
import User from '../models/userModel.js';

let listenersRegistered = false;

function safeConnectionError(error) {
  return `${error?.name ?? 'MongoDBError'}: ${String(error?.message ?? 'Unknown connection error')}`
    .replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, '[MongoDB URI redacted]')
    .replace(/(password\s*[:=]\s*)\S+/gi, '$1[redacted]');
}

function registerConnectionListeners() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', safeConnectionError(error));
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Mongoose will manage reconnection.');
  });
  mongoose.connection.on('reconnected', () => {
    console.info('MongoDB reconnected.');
  });
}

/** Connect once using the configured URI, then ensure model indexes exist. */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is missing. Set it in server/.env before starting HotelPro.');
    process.exit(1);
  }

  registerConnectionListeners();
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  } catch (error) {
    console.error('Could not connect to MongoDB. Check Atlas Network Access (allow the server IP; 0.0.0.0/0 is broad access), verify the database username and password, and URL-encode special characters in the password.');
    console.error('MongoDB connection detail:', safeConnectionError(error));
    process.exit(1);
  }

  await Promise.all([User.createIndexes(), Room.createIndexes(), Booking.createIndexes()]);
  const host = mongoose.connection.host;
  console.info(`MongoDB connected${host ? ` (${host})` : ''}`);
  return mongoose.connection;
}

export default connectDB;
