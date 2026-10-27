import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Room from '../models/Room.js';
import User from '../models/User.js';

/** Connect the API to the MongoDB database configured in the environment. */
export async function connectDatabase() {
  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is missing. Add it to server/.env before starting the API.');
  }

  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });

  // Wait for the unique room/night index before accepting booking requests.
  await Promise.all([
    User.createIndexes(),
    Room.createIndexes(),
    Booking.createIndexes(),
    Payment.createIndexes(),
  ]);

  return mongoose.connection;
}
