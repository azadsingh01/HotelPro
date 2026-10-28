import Booking from '../models/bookingModel.js';
import Room from '../models/roomModel.js';
import { ACTIVE_BOOKING_STATUSES } from '../utils/dateOverlap.js';

function getUtcDayBounds() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function formatDate(date) { return date.toISOString().slice(0, 10); }

export async function getOverviewStats(_request, response) {
  const { start: today } = getUtcDayBounds();
  const [totalBookings, activeBookings, cancelledBookings, rooms, paidRows, occupiedRows] = await Promise.all([
    Booking.countDocuments(),
    Booking.countDocuments({ status: { $in: ACTIVE_BOOKING_STATUSES } }),
    Booking.countDocuments({ status: 'cancelled' }),
    Room.find({ isActive: true, status: 'available' }).select('count').lean(),
    Booking.aggregate([
      { $match: { 'cardDetails.paymentStatus': 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Booking.aggregate([
      { $match: { status: { $in: ACTIVE_BOOKING_STATUSES }, fromdate: { $lte: today }, todate: { $gt: today } } },
      { $group: { _id: '$roomid', units: { $sum: 1 } } },
    ]),
  ]);
  const totalRooms = rooms.reduce((sum, room) => sum + room.count, 0);
  const occupiedUnits = occupiedRows.reduce((sum, row) => sum + row.units, 0);
  const totalRevenue = paidRows[0]?.total ?? 0;
  response.json({
    totalBookings,
    activeBookings,
    cancelledBookings,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    currency: 'USD',
    occupancyRate: totalRooms === 0 ? 0 : Math.round((occupiedUnits / totalRooms) * 10000) / 100,
    occupiedRooms: occupiedUnits,
    totalRooms,
    occupancyDate: formatDate(today),
    occupancyTimezone: 'UTC',
  });
}

export async function getTodayStats(_request, response) {
  const { start, end } = getUtcDayBounds();
  const [todayCheckIns, todayCheckOuts] = await Promise.all([
    Booking.countDocuments({ status: { $ne: 'cancelled' }, fromdate: { $gte: start, $lt: end } }),
    Booking.countDocuments({ status: { $ne: 'cancelled' }, todate: { $gte: start, $lt: end } }),
  ]);
  response.json({ date: formatDate(start), timezone: 'UTC', todayCheckIns, todayCheckOuts });
}
