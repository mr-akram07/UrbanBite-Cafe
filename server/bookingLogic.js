/**
 * Core validation and conflict detection logic for Restaurant Table Booking.
 * Implements:
 * 1. Admin-configurable Operating Hours (Open/Close times - no bookings outside these hours).
 * 2. Minimum booking duration.
 * 3. Strict double-booking prevention.
 * 4. Turnover buffer rule before any advance booking.
 * 5. Cancellation cutoff policy.
 */

// Helper: Convert "HH:mm" to minutes from midnight
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper: Convert minutes from midnight to "HH:mm"
function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Helper: Combine date "YYYY-MM-DD" and time "HH:mm" into Date object in local time
function getBookingDateTime(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

/**
 * Validate proposed booking against existing bookings on the table and restaurant operating hours
 * @param {Array} existingBookings - active bookings for the table on that date
 * @param {string} startTime - "HH:mm"
 * @param {string} endTime - "HH:mm"
 * @param {string|null} excludeBookingId - for updates (ignore self)
 * @param {Object} settings - restaurant settings (openTime, closeTime, turnoverBufferMinutes, minBookingMinutes)
 */
function validateBookingSlot(existingBookings, startTime, endTime, excludeBookingId = null, settings = {}) {
  const reqStart = timeToMinutes(startTime);
  const reqEnd = timeToMinutes(endTime);

  // 1. Operating Hours Check (Admin configurable)
  const openTime = settings.openTime || '11:00';
  const closeTime = settings.closeTime || '23:00';
  const openMin = timeToMinutes(openTime);
  const closeMin = timeToMinutes(closeTime);

  if (reqStart < openMin) {
    return {
      valid: false,
      error: `Restaurant is closed at ${startTime}. Operating hours start at ${openTime}.`
    };
  }

  if (reqEnd > closeMin) {
    return {
      valid: false,
      error: `Restaurant closes at ${closeTime}. Bookings must conclude by ${closeTime}. (Requested end time: ${endTime})`
    };
  }

  // 2. Duration check: Minimum booking duration
  const minDuration = settings.minBookingMinutes !== undefined ? parseInt(settings.minBookingMinutes, 10) : 30;
  const duration = reqEnd - reqStart;
  if (duration < minDuration) {
    return {
      valid: false,
      error: `Minimum booking duration is ${minDuration} minutes. Requested duration is only ${duration} minutes.`
    };
  }

  // Filter active (confirmed/seated) bookings only
  const activeBookings = (existingBookings || []).filter(b => 
    b.status !== 'Cancelled' && (!excludeBookingId || b.id !== excludeBookingId)
  );

  const bufferMinutes = settings.turnoverBufferMinutes !== undefined ? parseInt(settings.turnoverBufferMinutes, 10) : 30;

  for (const b of activeBookings) {
    const existStart = timeToMinutes(b.startTime);
    const existEnd = timeToMinutes(b.endTime);

    // Direct overlap check:
    if (reqStart < existEnd && reqEnd > existStart) {
      return {
        valid: false,
        error: `Double-booking conflict! Table is already booked by ${b.customerName} from ${b.startTime} to ${b.endTime}.`,
        conflictBooking: b
      };
    }

    // Advance booking turnover buffer rule:
    // If the proposed booking is BEFORE this existing booking (reqStart < existStart),
    // it MUST end at least bufferMinutes before the existing booking starts!
    if (reqStart < existStart) {
      const maxAllowedEnd = existStart - bufferMinutes;
      if (reqEnd > maxAllowedEnd) {
        return {
          valid: false,
          error: `Table has an upcoming reservation at ${b.startTime}. To avoid double-booking and allow table turnover, your booking must end at or before ${minutesToTime(maxAllowedEnd)} (at least ${bufferMinutes} minutes prior).`,
          conflictBooking: b,
          maxAllowedEndTime: minutesToTime(maxAllowedEnd),
          nextBookingStart: b.startTime
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Get detailed availability and constraints for a table on a given date
 * @param {Array} bookingsForTableOnDate 
 * @param {string|null} requestedStartTime - optional
 * @param {Object} settings - restaurant settings
 */
function getTableScheduleDetails(bookingsForTableOnDate, requestedStartTime = null, settings = {}) {
  const active = (bookingsForTableOnDate || [])
    .filter(b => b.status !== 'Cancelled')
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  const bufferMinutes = settings.turnoverBufferMinutes !== undefined ? parseInt(settings.turnoverBufferMinutes, 10) : 30;
  let nextBooking = null;
  let maxEndTimeAllowed = null;

  if (requestedStartTime) {
    const reqStartMin = timeToMinutes(requestedStartTime);
    for (const b of active) {
      const bStartMin = timeToMinutes(b.startTime);
      if (bStartMin > reqStartMin) {
        nextBooking = b;
        maxEndTimeAllowed = minutesToTime(bStartMin - bufferMinutes);
        break;
      }
    }
  }

  return {
    activeBookings: active,
    nextBooking,
    maxEndTimeAllowed
  };
}

/**
 * Check if a booking is cancellable based on the cancellation cutoff rule
 * @param {Object} booking 
 * @param {Date} now
 * @param {Object} settings
 */
function canCancelBooking(booking, now = new Date(), settings = {}) {
  if (booking.status === 'Cancelled') {
    return {
      allowed: false,
      reason: 'Booking is already cancelled.'
    };
  }

  const cutoffMinutes = settings.cancellationCutoffMinutes !== undefined ? parseInt(settings.cancellationCutoffMinutes, 10) : 30;
  const bookingDateTime = getBookingDateTime(booking.date, booking.startTime);
  const cutoffTime = new Date(bookingDateTime.getTime() - cutoffMinutes * 60 * 1000);
  const minutesRemaining = Math.floor((bookingDateTime.getTime() - now.getTime()) / (60 * 1000));

  if (now.getTime() > cutoffTime.getTime()) {
    return {
      allowed: false,
      reason: `Cancellation locked! Bookings cannot be cancelled within ${cutoffMinutes} minutes of reservation time. (Cutoff was ${cutoffTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      minutesRemaining,
      cutoffTime: cutoffTime.toISOString()
    };
  }

  return {
    allowed: true,
    minutesRemaining,
    cutoffTime: cutoffTime.toISOString()
  };
}

module.exports = {
  timeToMinutes,
  minutesToTime,
  getBookingDateTime,
  validateBookingSlot,
  getTableScheduleDetails,
  canCancelBooking
};
