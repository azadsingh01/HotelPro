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

/** Validate a stay and return its UTC dates and number of nights. */
export function createStayDates(
  checkInValue,
  checkOutValue,
  { maxNights, futureOnly = false } = {},
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

  return { checkIn, checkOut, nights };
}

/** Validate the optional or required check-in/check-out pair on a request. */
export function validateStayDates(
  source,
  { required = false, maxNights, futureOnly = false } = {},
) {
  return function checkStayDates(request, _response, next) {
    const sourceData = request[source] ?? {};
    const checkIn = sourceData.fromdate ?? sourceData.checkIn;
    const checkOut = sourceData.todate ?? sourceData.checkOut;
    const hasCheckIn = checkIn !== undefined;
    const hasCheckOut = checkOut !== undefined;

    if (!hasCheckIn && !hasCheckOut && !required) {
      return next();
    }

    if (hasCheckIn !== hasCheckOut) {
      return next(new ApiError(400, 'Provide both fromdate and todate values.'));
    }

    try {
      request.stayDates = createStayDates(checkIn, checkOut, {
        maxNights,
        futureOnly,
      });
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

/** Validate that a supplied min/max price filter is in ascending order. */
export function validatePriceRange(request, _response, next) {
  const { minRent, maxRent } = request.query ?? {};

  if (minRent !== undefined && maxRent !== undefined && Number(minRent) > Number(maxRent)) {
    return next(new ApiError(400, 'minRent cannot be greater than maxRent.'));
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
