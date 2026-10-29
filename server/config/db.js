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
  const uri = process.env.MONGO_URI;
  if (!uri) {
    const error = new Error('MONGO_URI is not set');
    console.error(error.message);
    throw error;
  }

  registerConnectionListeners();
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  } catch (error) {
    console.error('Could not connect to MongoDB:', error);
    throw error;
  }

  await Promise.all([User.createIndexes(), Room.createIndexes(), Booking.createIndexes()]);
  const host = mongoose.connection.host;
  console.info(`MongoDB connected${host ? ` (${host})` : ''}`);
  return mongoose.connection;
}

export default connectDB;
