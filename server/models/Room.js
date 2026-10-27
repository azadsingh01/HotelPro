import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: 20,
  },
  type: {
    type: String,
    enum: ['single', 'double', 'twin', 'suite', 'family'],
    required: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: '',
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
    max: 20,
  },
  pricePerNight: {
    type: Number,
    required: true,
    min: 0,
  },
  amenities: {
    type: [{ type: String, trim: true, maxlength: 60 }],
    default: [],
  },
  status: {
    type: String,
    enum: ['available', 'maintenance', 'out_of_service'],
    default: 'available',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

roomSchema.index({ isActive: 1, status: 1, type: 1, pricePerNight: 1 });

const Room = mongoose.model('Room', roomSchema);

export default Room;
