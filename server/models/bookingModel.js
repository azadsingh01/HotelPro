import mongoose from 'mongoose';

const cardDetailsSchema = new mongoose.Schema({
  cardholdername: { type: String, trim: true, maxlength: [80, 'Cardholder name must be 80 characters or fewer.'], default: '' },
  last4: { type: String, match: [/^(\d{4})?$/, 'Only the last four card digits may be stored.'], default: '' },
  expmonthyear: { type: String, match: [/^$|(0[1-9]|1[0-2])\/\d{2}$/, 'Expiry must use MM/YY format.'], default: '' },
  paymentStatus: {
    type: String,
    enum: { values: ['paid', 'pending', 'failed'], message: 'Payment status must be paid, pending, or failed.' },
    default: 'pending',
    required: [true, 'Payment status is required.'],
  },
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  roomid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room is required.'],
  },
  type: {
    type: String,
    enum: { values: ['single', 'double', 'twin', 'deluxe', 'suite', 'family'], message: 'Booking room type is invalid.' },
    required: [true, 'Room type is required.'],
  },
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Booking user is required.'],
  },
  username: {
    type: String,
    required: [true, 'Guest name is required.'],
    trim: true,
    minlength: 2,
    maxlength: 80,
  },
  phone: {
    type: String,
    required: [true, 'Guest phone is required.'],
    trim: true,
    match: [/^\d{10,15}$/, 'Phone must contain 10 to 15 digits.'],
  },
  fromdate: { type: Date, required: [true, 'Check-in date is required.'] },
  todate: {
    type: Date,
    required: [true, 'Check-out date is required.'],
    validate: {
      validator(value) { return !this.fromdate || value > this.fromdate; },
      message: 'Check-out must be later than check-in.',
    },
  },
  totaldays: {
    type: Number,
    required: [true, 'Total nights is required.'],
    min: [1, 'A booking must be at least one night.'],
    max: [365, 'A booking cannot exceed 365 nights.'],
  },
  // Kept for the existing guest-count booking form; amount is always server-calculated.
  guests: { type: Number, default: 1, min: 1, max: 20 },
  totalAmount: { type: Number, required: [true, 'Total amount is required.'], min: [0, 'Total amount cannot be negative.'] },
  status: {
    type: String,
    enum: { values: ['booked', 'cancelled', 'checked-in', 'checked-out'], message: 'Booking status is invalid.' },
    default: 'booked',
    required: [true, 'Booking status is required.'],
    index: true,
  },
  cardDetails: {
    type: cardDetailsSchema,
    default: () => ({ paymentStatus: 'pending' }),
  },
}, { timestamps: true });

bookingSchema.index({ userid: 1, createdAt: -1 });
bookingSchema.index({ roomid: 1, fromdate: 1, todate: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
