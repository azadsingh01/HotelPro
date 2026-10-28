import mongoose from 'mongoose';
import '../config/env.js';
import { connectDB } from '../config/db.js';
import Booking from '../models/bookingModel.js';
import Room from '../models/roomModel.js';
import User from '../models/userModel.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const VALID_BOOKING_STATUSES = new Set(['booked', 'cancelled', 'checked-in', 'checked-out']);

function asDate(value, field, documentId) {
  const date = value instanceof Date ? value : new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`Cannot migrate ${field} for document ${documentId}: the value is missing or invalid.`);
  }
  return date;
}

function asRoomNumber(value, documentId) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  const match = String(value ?? '').match(/(\d+)\D*$/);
  const number = match ? Number(match[1]) : NaN;
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`Cannot migrate roomNumber for room ${documentId}: expected a positive integer or a legacy label ending in digits.`);
  }
  return number;
}

function normalizedUserType(user) {
  const value = String(user.userType ?? user.type ?? user.role ?? '').toLowerCase();
  return value === 'admin' ? 'Admin' : 'Ordinary';
}

function normalizedStatus(value) {
  if (value === 'checked_in') return 'checked-in';
  if (value === 'checked_out') return 'checked-out';
  return VALID_BOOKING_STATUSES.has(value) ? value : 'booked';
}

function normalizePhone(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const digits = String(value).replace(/\D/g, '');
  return /^\d{10,15}$/.test(digits) ? digits : undefined;
}

function safePaymentDetails(booking) {
  const source = booking.cardDetails ?? booking.payment ?? {};
  const rawNumber = source.cardnumber ?? source.cardNumber ?? source.number;
  const digits = typeof rawNumber === 'string' ? rawNumber.replace(/\D/g, '') : '';
  const existingLast4Value = String(source.last4 ?? '').replace(/\D/g, '');
  const existingLast4 = /^\d{4}$/.test(existingLast4Value) ? existingLast4Value : '';
  const expirationValue = String(source.expmonthyear ?? source.expMonthYear ?? '');
  const expmonthyear = /^(0[1-9]|1[0-2])\/\d{2}$/.test(expirationValue) ? expirationValue : '';
  const paymentStatus = String(source.paymentStatus ?? booking.paymentStatus ?? '').toLowerCase();
  return {
    cardholdername: String(source.cardholdername ?? source.cardholderName ?? '').slice(0, 80),
    last4: existingLast4 || digits.slice(-4),
    expmonthyear,
    paymentStatus: ['paid', 'pending'].includes(paymentStatus) ? paymentStatus : 'failed',
  };
}

function idValue(value) {
  if (value && typeof value === 'object' && value._id) return value._id;
  return value;
}

function normalizeRoomBooking(entry) {
  const bookingId = idValue(entry.bookingId ?? entry.bookingid ?? entry._id);
  const userid = idValue(entry.userid ?? entry.userId ?? entry.user);
  if (!bookingId || !userid) return null;
  const fromdate = asDate(entry.fromdate ?? entry.fromDate ?? entry.checkIn, 'currentBookings.fromdate', bookingId);
  const todate = asDate(entry.todate ?? entry.toDate ?? entry.checkOut, 'currentBookings.todate', bookingId);
  return { bookingId, userid, fromdate, todate, status: normalizedStatus(entry.status) };
}

async function migrate() {
  await connectDB();
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();
  const rooms = await db.collection('rooms').find({}).toArray();
  const bookings = await db.collection('bookings').find({}).toArray();

  // Preflight all values that could collide or invalidate references before writing anything.
  const roomNumbers = new Map();
  const roomNumbersById = new Map();
  const roomsById = new Map();
  for (const room of rooms) {
    const roomNumber = asRoomNumber(room.roomNumber, room._id);
    if (!String(room.description ?? '').trim()) {
      throw new Error(`Cannot migrate room ${room._id}: description is missing.`);
    }
    const previousId = roomNumbers.get(roomNumber);
    if (previousId && previousId.toString() !== room._id.toString()) {
      throw new Error(`Room-number conversion would create a duplicate at ${roomNumber}. Resolve that collision before migration.`);
    }
    roomNumbers.set(roomNumber, room._id);
    roomNumbersById.set(room._id.toString(), roomNumber);
    roomsById.set(room._id.toString(), room);
  }

  const emailsByNormalizedValue = new Map();
  const usersById = new Map();
  for (const user of users) {
    const email = String(user.email ?? '').trim().toLowerCase();
    const name = String(user.name ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`Cannot migrate user ${user._id}: email is missing or invalid.`);
    }
    if (name.length < 2) throw new Error(`Cannot migrate user ${user._id}: name is missing or too short.`);
    const previousId = emailsByNormalizedValue.get(email);
    if (previousId && previousId.toString() !== user._id.toString()) {
      throw new Error(`Email normalization would create a duplicate at ${email}. Resolve that collision before migration.`);
    }
    emailsByNormalizedValue.set(email, user._id);
    usersById.set(user._id.toString(), {
      ...user,
      name,
      email,
      userType: normalizedUserType(user),
      phone: normalizePhone(user.phone),
    });
  }
  const bookingPlans = bookings.map((booking) => {
    const userid = idValue(booking.userid ?? booking.user ?? booking.guest);
    const roomid = idValue(booking.roomid ?? booking.room ?? booking.roomId);
    const fromdate = asDate(booking.fromdate ?? booking.checkIn, 'fromdate', booking._id);
    const todate = asDate(booking.todate ?? booking.checkOut, 'todate', booking._id);
    if (todate <= fromdate) throw new Error(`Cannot migrate booking ${booking._id}: todate must be after fromdate.`);
    const user = userid ? usersById.get(userid.toString()) : null;
    const room = roomid ? roomsById.get(roomid.toString()) : null;
    if (!room) throw new Error(`Cannot migrate booking ${booking._id}: its room reference is missing.`);
    if (!user) throw new Error(`Cannot migrate booking ${booking._id}: its user reference is missing.`);
    const calculatedDays = Math.round((todate.getTime() - fromdate.getTime()) / DAY_MS);
    const type = String(room.type ?? booking.type ?? 'double').toLowerCase();
    const safeCardDetails = safePaymentDetails(booking);
    const values = {
      roomid,
      userid,
      type,
      username: String(booking.username ?? booking.name ?? user?.name ?? 'HotelPro Guest').slice(0, 80),
      fromdate,
      todate,
      totaldays: Number.isInteger(booking.totaldays) && booking.totaldays > 0 ? booking.totaldays : Math.max(1, calculatedDays),
      totalAmount: Number.isFinite(booking.totalAmount) ? booking.totalAmount : Math.round((room.rent ?? 0) * calculatedDays * 100) / 100,
      status: normalizedStatus(booking.status),
      cardDetails: safeCardDetails,
    };
    if (booking.guests !== undefined) values.guests = booking.guests;
    const phone = normalizePhone(booking.phone) ?? user?.phone;
    if (phone) values.phone = phone;
    return { original: booking, values };
  });

  const roomEntriesById = new Map();
  for (const room of rooms) {
    const entries = new Map();
    const existingEntries = [
      ...(Array.isArray(room.currentBookings) ? room.currentBookings : []),
      ...(Array.isArray(room.currentbooking) ? room.currentbooking : []),
    ];
    for (const oldEntry of existingEntries) {
      const normalized = normalizeRoomBooking(oldEntry);
      if (normalized) entries.set(normalized.bookingId.toString(), normalized);
    }
    roomEntriesById.set(room._id.toString(), entries);
  }

  const updates = { users: 0, rooms: 0, bookings: 0, bookingEntries: 0, removedUnsafePaymentFields: 0 };
  for (const user of users) {
    const normalized = usersById.get(user._id.toString());
    const set = { userType: normalized.userType, email: normalized.email, name: normalized.name };
    if (normalized.phone) set.phone = normalized.phone;
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: set, $unset: { type: '', role: '' } },
    );
    updates.users += 1;
  }

  for (const { original, values } of bookingPlans) {
    const set = { ...values };
    const unset = {
      user: '', room: '', roomId: '', name: '', checkIn: '', checkOut: '', payment: '', paymentStatus: '',
      cardnumber: '', cardNumber: '', cvvcode: '', cvv: '',
    };
    await db.collection('bookings').updateOne({ _id: original._id }, { $set: set, $unset: unset });
    updates.bookings += 1;

    if (values.userid) {
      const roomEntries = roomEntriesById.get(values.roomid.toString());
      roomEntries.set(original._id.toString(), {
        bookingId: original._id,
        userid: values.userid,
        fromdate: values.fromdate,
        todate: values.todate,
        status: values.status,
      });
    }
  }

  for (const room of rooms) {
    const currentBookings = [...roomEntriesById.get(room._id.toString()).values()];
    await db.collection('rooms').updateOne(
      { _id: room._id },
      {
        $set: {
          roomNumber: roomNumbersById.get(room._id.toString()),
          type: String(room.type ?? 'double').toLowerCase(),
          photos: room.photos ?? [],
          count: room.count ?? 1,
          currentBookings,
        },
        $unset: { currentbooking: '', pricePerNight: '' },
      },
    );
    updates.rooms += 1;
    updates.bookingEntries += currentBookings.length;
  }

  // Old standalone payment records are not used by the current model. Scrub sensitive
  // fields if that legacy collection exists, while preserving its non-sensitive records.
  const collections = await db.listCollections({ name: 'payments' }).toArray();
  if (collections.length) {
    const result = await db.collection('payments').updateMany({}, {
      $unset: {
        cardnumber: '', cardNumber: '', cvvcode: '', cvv: '',
        'cardDetails.cardnumber': '', 'cardDetails.cardNumber': '', 'cardDetails.cvvcode': '', 'cardDetails.cvv': '',
        'payment.cardnumber': '', 'payment.cardNumber': '', 'payment.cvvcode': '', 'payment.cvv': '',
      },
    });
    updates.removedUnsafePaymentFields = result.modifiedCount;
  }

  await Promise.all([User.syncIndexes(), Room.syncIndexes(), Booking.syncIndexes()]);
  console.log('HotelPro schema migration completed safely.');
  console.log(`Users normalized: ${updates.users}; rooms normalized: ${updates.rooms}; bookings normalized: ${updates.bookings}.`);
  console.log(`Room booking entries normalized: ${updates.bookingEntries}; legacy payment records scrubbed: ${updates.removedUnsafePaymentFields}.`);
  console.log('No card number or CVV values were printed. Run this migration again safely if needed.');
}

try {
  await migrate();
} catch (error) {
  console.error('Could not migrate HotelPro data:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
