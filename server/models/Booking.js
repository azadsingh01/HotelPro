import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  checkIn: {
    type: Date,
    required: true,
  },
  checkOut: {
    type: Date,
    required: true,
    validate: {
      validator(value) {
        return !this.checkIn || value > this.checkIn;
      },
      message: 'Check-out must be later than check-in.',
    },
  },
  guests: {
    type: Number,
    required: true,
    min: 1,
    max: 20,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['booked', 'checked_in', 'checked_out', 'cancelled'],
    default: 'booked',
    required: true,
    index: true,
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'pending', 'paid', 'refunded'],
    default: 'unpaid',
    required: true,
    index: true,
  },
  // One UTC midnight date per occupied night; the unique index closes booking races.
  reservedNights: {
    type: [Date],
    default: [],
    select: false,
  },
  occupiesRoom: {
    type: Boolean,
    default: true,
    select: false,
  },
}, { timestamps: true });

// Supports room/date overlap checks and a guest's newest bookings.
bookingSchema.index({ room: 1, status: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ guest: 1, createdAt: -1 });
bookingSchema.index(
  { room: 1, reservedNights: 1 },
  {
    unique: true,
    name: 'one_active_booking_per_room_night',
    partialFilterExpression: { occupiesRoom: true },
  },
);

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
