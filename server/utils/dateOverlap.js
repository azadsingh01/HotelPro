export const ACTIVE_BOOKING_STATUSES = Object.freeze(['booked', 'checked-in']);

/** Half-open date intervals overlap when start < checkout and end > checkin. */
export function dateRangesOverlap(start, end, checkIn, checkOut) {
  return new Date(start) < new Date(checkOut) && new Date(end) > new Date(checkIn);
}

export function countActiveOverlaps(bookings = [], checkIn, checkOut) {
  return bookings.filter((booking) => (
    ACTIVE_BOOKING_STATUSES.includes(booking.status)
    && dateRangesOverlap(booking.fromdate, booking.todate, checkIn, checkOut)
  )).length;
}

/** MongoDB expression equivalent of dateRangesOverlap for an embedded booking. */
export function dateOverlapExpression(startExpression, endExpression, checkIn, checkOut) {
  return {
    $and: [
      { $lt: [startExpression, checkOut] },
      { $gt: [endExpression, checkIn] },
    ],
  };
}

/** Atomic room inventory predicate used when reserving a room unit. */
export function roomHasAvailabilityExpression(checkIn, checkOut) {
  return {
    $expr: {
      $gt: [
        '$count',
        {
          $size: {
            $filter: {
              input: { $ifNull: ['$currentBookings', []] },
              as: 'booking',
              cond: {
                $and: [
                  { $in: ['$$booking.status', ACTIVE_BOOKING_STATUSES] },
                  dateOverlapExpression('$$booking.fromdate', '$$booking.todate', checkIn, checkOut),
                ],
              },
            },
          },
        },
      ],
    },
  };
}
