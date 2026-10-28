import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import './config/env.js';
import { connectDB } from './config/db.js';
import Room from './models/roomModel.js';
import User from './models/userModel.js';

const BCRYPT_ROUNDS = 10;
const roomFixtures = [
  { roomNumber: 101, type: 'single', description: 'A quiet single room with a garden view.', capacity: 1, rent: 89, count: 2, amenities: ['Wi-Fi', 'Air conditioning', 'Work desk'], photos: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80'] },
  { roomNumber: 102, type: 'single', description: 'A bright single room with a comfortable reading corner.', capacity: 1, rent: 99, count: 1, amenities: ['Wi-Fi', 'Air conditioning', 'Reading chair', 'TV'], photos: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80'] },
  { roomNumber: 201, type: 'double', description: 'A standard double room with a queen bed.', capacity: 2, rent: 129, count: 4, amenities: ['Wi-Fi', 'Air conditioning', 'TV', 'Mini fridge'], photos: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80'] },
  { roomNumber: 202, type: 'double', description: 'A spacious double room overlooking the courtyard.', capacity: 2, rent: 145, count: 3, amenities: ['Wi-Fi', 'Air conditioning', 'TV', 'Coffee maker'], photos: ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80'] },
  { roomNumber: 203, type: 'twin', description: 'Twin beds and a calm palette for easy shared stays.', capacity: 2, rent: 159, count: 2, amenities: ['Wi-Fi', 'Twin beds', 'TV', 'Coffee maker'], photos: ['https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1200&q=80'] },
  { roomNumber: 301, type: 'deluxe', description: 'Deluxe room with a king bed and a private balcony.', capacity: 2, rent: 189, count: 2, amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Balcony', 'Coffee maker'], photos: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80'] },
  { roomNumber: 302, type: 'deluxe', description: 'Spacious deluxe room with a lounge area and city views.', capacity: 3, rent: 229, count: 2, amenities: ['Wi-Fi', 'Sofa bed', 'Smart TV', 'Mini fridge'], photos: ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80'] },
  { roomNumber: 401, type: 'suite', description: 'A one-bedroom suite with a separate living room.', capacity: 3, rent: 269, count: 2, amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Living room', 'Coffee maker'], photos: ['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80'] },
  { roomNumber: 402, type: 'suite', description: 'A family-friendly suite with a sofa bed and city views.', capacity: 4, rent: 319, count: 1, amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Sofa bed', 'Mini fridge'], photos: ['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80'] },
];

function getSeedCredentials({ nameVariable, passwordVariable, phone, email, defaultName }) {
  const name = process.env[nameVariable]?.trim() || defaultName;
  const password = process.env[passwordVariable];
  if (name.length < 2 || name.length > 80) throw new Error(`${nameVariable} must be between 2 and 80 characters.`);
  if (!password || password.startsWith('replace-') || Buffer.byteLength(password, 'utf8') < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error(`Set ${passwordVariable} in server/.env to a unique password between 12 and 72 bytes.`);
  }
  return { name, email, password, phone };
}

async function ensureSeedUser(credentials, userType) {
  const existing = await User.findOne({ email: credentials.email }).select('userType').lean();
  if (existing) {
    if (existing.userType !== userType) throw new Error(`Seed email ${credentials.email} already belongs to a ${existing.userType} account.`);
    return false;
  }
  const password = await bcrypt.hash(credentials.password, BCRYPT_ROUNDS);
  await new User({ name: credentials.name, email: credentials.email, password, phone: credentials.phone, userType }).save();
  return true;
}

async function seed() {
  const adminCredentials = getSeedCredentials({
    nameVariable: 'ADMIN_NAME',
    passwordVariable: 'ADMIN_PASSWORD',
    phone: '14155550100',
    email: 'admin@hotelpro.com',
    defaultName: 'HotelPro Admin',
  });
  const ordinaryCredentials = getSeedCredentials({
    nameVariable: 'ORDINARY_NAME',
    passwordVariable: 'ORDINARY_PASSWORD',
    phone: '14155550101',
    email: 'guest@hotelpro.com',
    defaultName: 'HotelPro Guest',
  });
  if (adminCredentials.password === ordinaryCredentials.password) {
    throw new Error('Use different values for ADMIN_PASSWORD and ORDINARY_PASSWORD.');
  }
  await connectDB();

  let roomsCreated = 0;
  let roomsSkipped = 0;
  for (const fixture of roomFixtures) {
    if (await Room.exists({ roomNumber: fixture.roomNumber })) {
      roomsSkipped += 1;
      continue;
    }
    await new Room({ ...fixture, currentBookings: [], status: 'available', isActive: true }).save();
    roomsCreated += 1;
  }

  const adminCreated = await ensureSeedUser(adminCredentials, 'Admin');
  const ordinaryCreated = await ensureSeedUser(ordinaryCredentials, 'Ordinary');
  console.log(`Rooms: ${roomsCreated} created, ${roomsSkipped} existing rooms skipped.`);
  console.log(`Admin login email: ${adminCredentials.email} (${adminCreated ? 'created' : 'already exists'}).`);
  console.log(`Ordinary login email: ${ordinaryCredentials.email} (${ordinaryCreated ? 'created' : 'already exists'}).`);
  console.warn('Local seed passwords come from ADMIN_PASSWORD and ORDINARY_PASSWORD in server/.env and are not printed. Change them before the final demo.');
}

try {
  await seed();
} catch (error) {
  console.error('Could not seed HotelPro:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
