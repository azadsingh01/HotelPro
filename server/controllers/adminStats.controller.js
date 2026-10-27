import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Room from '../models/Room.js';

const activeBookingStatuses = ['booked', 'checked_in'];

function getUtcDayBounds() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

/** Return all-time booking and net paid revenue totals plus today's occupancy. */
export async function getOverviewStats(_request, response) {
  const { start: today } = getUtcDayBounds();
  const [totalBookings, activeBookings, cancelledBookings, totalRooms, revenueRows, occupiedRoomIds] = await Promise.all([
    Booking.countDocuments(),
    Booking.countDocuments({ status: { $in: activeBookingStatuses } }),
    Booking.countDocuments({ status: 'cancelled' }),
    Room.countDocuments({ isActive: true, status: 'available' }),
    Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Booking.distinct('room', {
      status: { $in: activeBookingStatuses },
      checkIn: { $lte: today },
      checkOut: { $gt: today },
    }),
  ]);

  const occupiedRooms = await Room.countDocuments({
    _id: { $in: occupiedRoomIds },
    isActive: true,
    status: 'available',
  });
  const revenue = revenueRows[0]?.total ?? 0;

  response.json({
    totalBookings,
    activeBookings,
    cancelledBookings,
    totalRevenue: Math.round(revenue * 100) / 100,
    currency: 'USD',
    occupancyRate: totalRooms === 0 ? 0 : Math.round((occupiedRooms / totalRooms) * 10000) / 100,
    occupiedRooms,
    totalRooms,
    occupancyDate: formatDate(today),
    occupancyTimezone: 'UTC',
  });
}

/** Return the number of non-cancelled reservations arriving and departing today. */
export async function getTodayStats(_request, response) {
  const { start, end } = getUtcDayBounds();
  const [todayCheckIns, todayCheckOuts] = await Promise.all([
    Booking.countDocuments({
      status: { $ne: 'cancelled' },
      checkIn: { $gte: start, $lt: end },
    }),
    Booking.countDocuments({
      status: { $ne: 'cancelled' },
      checkOut: { $gte: start, $lt: end },
    }),
  ]);

  response.json({
    date: formatDate(start),
    timezone: 'UTC',
    todayCheckIns,
    todayCheckOuts,
  });
}
