import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import './config/env.js';
import { connectDatabase } from './config/database.js';
import Room from './models/Room.js';
import User from './models/User.js';

const BCRYPT_ROUNDS = 12;
const SEED_MANIFEST_ID = 'hotelpro-demo-seed-v1';
const manifestCollectionName = '_hotelpro_seed_manifests';

const userFixtures = [
  { name: 'HotelPro Admin', email: 'admin@hotelpro.com', password: 'Admin@12345', role: 'admin' },
  { name: 'HotelPro Staff', email: 'staff@hotelpro.com', password: 'Staff@12345', role: 'staff' },
  { name: 'HotelPro Guest', email: 'guest@hotelpro.com', password: 'Guest@12345', role: 'guest' },
];

// The Room model has no "deluxe" type. Deluxe rooms use the supported double
// type and describe the deluxe features in their description and amenities.
const roomFixtures = [
  {
    roomNumber: 'HP-101',
    type: 'single',
    description: 'A quiet single room with a garden view.',
    capacity: 1,
    pricePerNight: 89,
    amenities: ['Wi-Fi', 'Air conditioning', 'Work desk'],
    status: 'available',
  },
  {
    roomNumber: 'HP-102',
    type: 'single',
    description: 'A bright single room with a comfortable reading corner.',
    capacity: 1,
    pricePerNight: 99,
    amenities: ['Wi-Fi', 'Air conditioning', 'Reading chair', 'TV'],
    status: 'available',
  },
  {
    roomNumber: 'HP-201',
    type: 'double',
    description: 'A standard double room with a queen bed.',
    capacity: 2,
    pricePerNight: 129,
    amenities: ['Wi-Fi', 'Air conditioning', 'TV', 'Mini fridge'],
    status: 'available',
  },
  {
    roomNumber: 'HP-202',
    type: 'double',
    description: 'A spacious double room overlooking the courtyard.',
    capacity: 2,
    pricePerNight: 145,
    amenities: ['Wi-Fi', 'Air conditioning', 'TV', 'Coffee maker'],
    status: 'available',
  },
  {
    roomNumber: 'HP-203',
    type: 'double',
    description: 'A twin-bed double room suited to friends or colleagues.',
    capacity: 2,
    pricePerNight: 139,
    amenities: ['Wi-Fi', 'Air conditioning', 'TV', 'Work desk'],
    status: 'available',
  },
  {
    roomNumber: 'HP-301',
    type: 'double',
    description: 'Deluxe double room with a king bed and a private balcony.',
    capacity: 2,
    pricePerNight: 189,
    amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Balcony', 'Coffee maker'],
    status: 'available',
  },
  {
    roomNumber: 'HP-302',
    type: 'double',
    description: 'Deluxe double room with a lounge area and premium bedding.',
    capacity: 2,
    pricePerNight: 209,
    amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Lounge area', 'Mini bar'],
    status: 'available',
  },
  {
    roomNumber: 'HP-401',
    type: 'suite',
    description: 'A one-bedroom suite with a separate living room.',
    capacity: 3,
    pricePerNight: 269,
    amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Living room', 'Coffee maker'],
    status: 'available',
  },
  {
    roomNumber: 'HP-402',
    type: 'suite',
    description: 'A family-friendly suite with a sofa bed and city views.',
    capacity: 4,
    pricePerNight: 319,
    amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Sofa bed', 'Mini fridge'],
    status: 'available',
  },
  {
    roomNumber: 'HP-403',
    type: 'suite',
    description: 'A premium suite with a dining nook and spacious bathroom.',
    capacity: 3,
    pricePerNight: 349,
    amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Dining nook', 'Soaking tub'],
    status: 'available',
  },
];

async function seedDatabase() {
  // Keep compatibility with deployments that named this setting MONGO_URI;
  // the app's shared database configuration uses MONGODB_URI.
  if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
    process.env.MONGODB_URI = process.env.MONGO_URI;
  }

  await connectDatabase();

  const manifestCollection = mongoose.connection.collection(manifestCollectionName);
  const previousManifest = await manifestCollection.findOne({ _id: SEED_MANIFEST_ID });
  const previousUserIds = previousManifest?.userIds ?? [];
  const previousRoomIds = previousManifest?.roomIds ?? [];

  const seededUsers = await Promise.all(userFixtures.map(async (user) => ({
    ...user,
    _id: new mongoose.Types.ObjectId(),
    password: await bcrypt.hash(user.password, BCRYPT_ROUNDS),
  })));
  const seededRooms = roomFixtures.map((room) => ({
    ...room,
    _id: new mongoose.Types.ObjectId(),
  }));

  const userConflicts = await User.find({
    email: { $in: userFixtures.map(({ email }) => email) },
    _id: { $nin: previousUserIds },
  }).select('email').lean();
  const roomConflicts = await Room.find({
    roomNumber: { $in: roomFixtures.map(({ roomNumber }) => roomNumber) },
    _id: { $nin: previousRoomIds },
  }).select('roomNumber').lean();

  if (userConflicts.length || roomConflicts.length) {
    const conflicts = [
      ...userConflicts.map(({ email }) => `user ${email}`),
      ...roomConflicts.map(({ roomNumber }) => `room ${roomNumber}`),
    ];
    throw new Error(`Seed stopped to preserve records it does not own: ${conflicts.join(', ')}.`);
  }

  // Record both old and new IDs before deleting so a rerun can clean up safely
  // even if the process stops partway through inserting the replacement data.
  await manifestCollection.replaceOne(
    { _id: SEED_MANIFEST_ID },
    {
      _id: SEED_MANIFEST_ID,
      userIds: [...previousUserIds, ...seededUsers.map(({ _id }) => _id)],
      roomIds: [...previousRoomIds, ...seededRooms.map(({ _id }) => _id)],
      updatedAt: new Date(),
    },
    { upsert: true },
  );

  const [deletedUsers, deletedRooms] = await Promise.all([
    User.deleteMany({ _id: { $in: previousUserIds } }),
    Room.deleteMany({ _id: { $in: previousRoomIds } }),
  ]);

  const createdUsers = await User.create(seededUsers);
  const createdRooms = await Room.create(seededRooms);

  await manifestCollection.replaceOne(
    { _id: SEED_MANIFEST_ID },
    {
      _id: SEED_MANIFEST_ID,
      userIds: createdUsers.map(({ _id }) => _id),
      roomIds: createdRooms.map(({ _id }) => _id),
      updatedAt: new Date(),
    },
    { upsert: true },
  );

  console.log(`Removed ${deletedUsers.deletedCount} prior seed users and ${deletedRooms.deletedCount} prior seed rooms.`);
  console.log(`Created ${createdUsers.length} users: ${createdUsers.map(({ role, email }) => `${role} (${email})`).join(', ')}.`);
  console.log(`Created ${createdRooms.length} available rooms: ${createdRooms.map(({ roomNumber }) => roomNumber).join(', ')}.`);
}

try {
  await seedDatabase();
} catch (error) {
  console.error('Could not seed HotelPro:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
