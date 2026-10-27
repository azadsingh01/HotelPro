import ApiError from './ApiError.js';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parse a real YYYY-MM-DD calendar date as midnight UTC. */
export function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return date;
}

/** Validate a stay and return its dates, night count, and unique night keys. */
export function createStayDates(
  checkInValue,
  checkOutValue,
  { maxNights, futureOnly = false, includeReservedNights = false } = {},
) {
  const checkIn = parseDateOnly(checkInValue);
  const checkOut = parseDateOnly(checkOutValue);

  if (!checkIn || !checkOut) {
    throw new ApiError(400, 'Check-in and check-out must be valid YYYY-MM-DD dates.');
  }

  if (checkOut <= checkIn) {
    throw new ApiError(400, 'Check-out must be later than check-in.');
  }

  const nights = (checkOut.getTime() - checkIn.getTime()) / MILLISECONDS_PER_DAY;

  if (maxNights && nights > maxNights) {
    throw new ApiError(400, `A stay cannot exceed ${maxNights} nights.`);
  }

  if (futureOnly) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (checkIn < today) {
      throw new ApiError(400, 'Check-in cannot be in the past.');
    }
  }

  const reservedNights = includeReservedNights
    ? Array.from({ length: nights }, (_value, index) => (
      new Date(checkIn.getTime() + index * MILLISECONDS_PER_DAY)
    ))
    : undefined;

  return { checkIn, checkOut, nights, reservedNights };
}

/** Validate the optional or required check-in/check-out pair on a request. */
export function validateStayDates(
  source,
  { required = false, maxNights, futureOnly = false, includeReservedNights = false } = {},
) {
  return function checkStayDates(request, _response, next) {
    const { checkIn, checkOut } = request[source] ?? {};
    const hasCheckIn = checkIn !== undefined;
    const hasCheckOut = checkOut !== undefined;

    if (!hasCheckIn && !hasCheckOut && !required) {
      return next();
    }

    if (hasCheckIn !== hasCheckOut) {
      return next(new ApiError(400, 'Provide both checkIn and checkOut dates.'));
    }

    try {
      request.stayDates = createStayDates(checkIn, checkOut, {
        maxNights,
        futureOnly,
        includeReservedNights,
      });
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

/** Validate that a supplied min/max price filter is in ascending order. */
export function validatePriceRange(request, _response, next) {
  const { minPrice, maxPrice } = request.query ?? {};

  if (minPrice !== undefined && maxPrice !== undefined && Number(minPrice) > Number(maxPrice)) {
    return next(new ApiError(400, 'minPrice cannot be greater than maxPrice.'));
  }

  return next();
}

/** Require at least one recognized room field in a partial update. */
export function requireOneField(fields) {
  return function checkUpdateFields(request, _response, next) {
    const hasUpdate = fields.some((field) => Object.hasOwn(request.body ?? {}, field));

    if (!hasUpdate) {
      return next(new ApiError(400, 'Provide at least one supported field to update.'));
    }

    return next();
  };
}
