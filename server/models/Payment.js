import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01,
  },
  currency: {
    type: String,
    uppercase: true,
    trim: true,
    minlength: 3,
    maxlength: 3,
    default: 'USD',
    required: true,
  },
  method: {
    type: String,
    enum: ['mock', 'card', 'cash', 'online'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending',
    required: true,
    index: true,
  },
  transactionId: {
    type: String,
    trim: true,
    maxlength: 120,
    unique: true,
    sparse: true,
  },
  processedAt: {
    type: Date,
  },
  paidAt: {
    type: Date,
  },
  refundedAt: {
    type: Date,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
  },
}, { timestamps: true });

paymentSchema.index({ booking: 1 }, { unique: true, name: 'one_payment_per_booking' });
paymentSchema.index({ guest: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
