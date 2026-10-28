import mongoose from 'mongoose';

const currentBookingSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: [true, 'Booking id is required.'] },
  fromdate: { type: Date, required: [true, 'Booking start date is required.'] },
  todate: { type: Date, required: [true, 'Booking end date is required.'] },
  status: {
    type: String,
    enum: { values: ['booked', 'cancelled', 'checked-in', 'checked-out'], message: 'Booking status is invalid.' },
    default: 'booked',
    required: [true, 'Booking status is required.'],
  },
  userid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, 'Booking user is required.'] },
}, { _id: false });

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: Number,
    required: [true, 'Room number is required.'],
    unique: true,
    min: [1, 'Room number must be a positive integer.'],
    validate: {
      validator(value) { return Number.isInteger(value); },
      message: 'Room number must be a whole number.',
    },
  },
  type: {
    type: String,
    enum: { values: ['single', 'double', 'twin', 'deluxe', 'suite', 'family'], message: 'Choose a supported room type.' },
    required: [true, 'Room type is required.'],
  },
  description: {
    type: String,
    required: [true, 'Room description is required.'],
    trim: true,
    maxlength: [1000, 'Description must be 1000 characters or fewer.'],
  },
  photos: {
    type: [{ type: String, trim: true, maxlength: [2048, 'Photo URL must be 2048 characters or fewer.'] }],
    default: [],
    validate: {
      validator(values) {
        return values.length <= 20 && values.every((value) => {
          try {
            const url = new URL(value);
            return ['http:', 'https:'].includes(url.protocol);
          } catch {
            return false;
          }
        });
      },
      message: 'Photos must contain up to 20 valid HTTP(S) image URLs.',
    },
  },
  capacity: {
    type: Number,
    min: [1, 'Capacity must be at least 1.'],
    max: 20,
    default: 2,
  },
  rent: {
    type: Number,
    required: [true, 'Rent is required.'],
    min: [0, 'Rent cannot be negative.'],
  },
  count: {
    type: Number,
    required: [true, 'Room count is required.'],
    min: [0, 'Room count cannot be negative.'],
    max: 10000,
    default: 1,
  },
  currentBookings: {
    type: [currentBookingSchema],
    default: [],
  },
  amenities: {
    type: [{ type: String, trim: true, maxlength: 60 }],
    default: [],
  },
  status: {
    type: String,
    enum: { values: ['available', 'maintenance', 'out_of_service'], message: 'Room status is invalid.' },
    default: 'available',
    required: [true, 'Room status is required.'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

roomSchema.index({ isActive: 1, status: 1, type: 1, rent: 1 });

const Room = mongoose.model('Room', roomSchema);

export default Room;
