import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  street: { type: String, trim: true, maxlength: 120 },
  city: { type: String, trim: true, maxlength: 80 },
  state: { type: String, trim: true, maxlength: 80 },
  postalCode: { type: String, trim: true, maxlength: 20 },
  country: { type: String, trim: true, maxlength: 80 },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 80,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    enum: ['guest', 'staff', 'admin'],
    default: 'guest',
    required: true,
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 32,
  },
  address: {
    type: addressSchema,
    default: undefined,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  toJSON: {
    transform(_document, result) {
      delete result.password;
      delete result.__v;
      return result;
    },
  },
});

userSchema.index({ role: 1, isActive: 1 });

const User = mongoose.model('User', userSchema);

export default User;
