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
    required: [true, 'Name is required.'],
    trim: true,
    minlength: 2,
    maxlength: 80,
    validate: {
      validator(value) { return typeof value === 'string' && value.trim().length >= 2; },
      message: 'Name must contain at least 2 characters.',
    },
  },
  email: {
    type: String,
    required: [true, 'Email is required.'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'],
  },
  password: {
    type: String,
    required: [true, 'Password is required.'],
    select: false,
  },
  userType: {
    type: String,
    enum: { values: ['Ordinary', 'Admin'], message: 'User type must be Ordinary or Admin.' },
    default: 'Ordinary',
    required: [true, 'User type is required.'],
  },
  phone: {
    type: String,
    required: [true, 'Phone is required.'],
    trim: true,
    match: [/^\d{10,15}$/, 'Phone must contain 10 to 15 digits.'],
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

userSchema.index({ userType: 1, isActive: 1 });

const User = mongoose.model('User', userSchema);

export default User;
