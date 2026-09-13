const { sql } = require("../db");

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDayName(date) {
  if (!date) return null;
  let parsed;
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) return null;
    parsed = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  } else {
    const text = String(date).trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    } else {
      parsed = new Date(text);
    }
  }
  if (Number.isNaN(parsed.getTime())) return null;
  return DAY_NAMES[parsed.getDay()] || null;
}

function normalizeTime(value) {
  if (!value) return null;
  const text = String(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function timeToMinutes(value) {
  const normalized = normalizeTime(value);
  if (!normalized) return null;
  const [h, m] = normalized.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatTimeTo12Hour(time24) {
  const normalized = normalizeTime(time24);
  if (!normalized) return time24;
  const [h, m] = normalized.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

function parseDoctorSchedule(availability) {
  if (!availability) return [];
  if (Array.isArray(availability)) return availability;
  try {
    const parsed = JSON.parse(availability);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getDoctorShiftForDate(availability, date) {
  const day = getDayName(date);
  if (!day) return null;
  const schedules = parseDoctorSchedule(availability);
  const match = schedules.find((s) => String(s.day || "").toLowerCase() === day.toLowerCase());
  if (!match) return null;

  const startTime = normalizeTime(match.start_time);
  const endTime = normalizeTime(match.end_time);
  if (!startTime || !endTime) return null;

  return {
    day,
    start_time: startTime,
    end_time: endTime,
    label: `${formatTimeTo12Hour(startTime)} - ${formatTimeTo12Hour(endTime)}`,
  };
}

/**
 * Generate 30-minute interval slots between start and end time
 */
function generateTimeSlots(startTime, endTime, intervalMinutes = 30) {
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  if (startMins === null || endMins === null || startMins >= endMins) {
    return [];
  }

  const slots = [];
  let curr = startMins;
  while (curr + intervalMinutes <= endMins) {
    slots.push(minutesToTime(curr));
    curr += intervalMinutes;
  }
  return slots;
}

/**
 * Check if a doctor is on approved leave for a given date
 */
async function isDoctorOnLeave(pool, doctorId, date) {
  try {
    const res = await pool
      .request()
      .input("docId", sql.UniqueIdentifier, doctorId)
      .input("targetDate", sql.Date, date)
      .query(`
        SELECT TOP 1 l.id
        FROM employee_leaves l
        JOIN employees e ON e.id = l.employee_id
        JOIN doctors d ON (d.staff_user_id = e.staff_user_id OR d.full_name = e.full_name)
        WHERE d.id = @docId
          AND l.status = 'approved'
          AND @targetDate >= l.start_date
          AND @targetDate <= l.end_date
      `);
    return res.recordset.length > 0;
  } catch (err) {
    console.warn("isDoctorOnLeave check warning:", err.message);
    return false;
  }
}

/**
 * Calculate the next available consultation time slot for a doctor on a specific date
 * Considers doctor schedule, existing non-cancelled bookings, and current time (if today).
 */
async function getNextAvailableAppointmentTime(pool, doctorId, date, intervalMinutes = 30) {
  const cleanDate = String(date).slice(0, 10);
  const doctorRes = await pool
    .request()
    .input("docId", sql.UniqueIdentifier, doctorId)
    .query(`
      SELECT d.id, d.full_name, d.status, d.availability, dept.name AS department_name
      FROM doctors d
      LEFT JOIN departments dept ON dept.id = d.department_id
      WHERE d.id = @docId
    `);

  const doctor = doctorRes.recordset[0];
  if (!doctor || doctor.status !== "active") {
    return { available: false, reason: "Doctor is inactive or not found", nextSlot: null, allSlots: [] };
  }

  // Check approved leave
  const onLeave = await isDoctorOnLeave(pool, doctorId, cleanDate);
  if (onLeave) {
    return { available: false, reason: "Doctor is on approved leave on this date", nextSlot: null, allSlots: [] };
  }

  // Check shift
  const shift = getDoctorShiftForDate(doctor.availability, cleanDate);
  if (!shift) {
    return {
      available: false,
      reason: `Doctor is not scheduled on ${getDayName(cleanDate)}`,
      nextSlot: null,
      allSlots: [],
    };
  }

  const generatedSlots = generateTimeSlots(shift.start_time, shift.end_time, intervalMinutes);
  if (generatedSlots.length === 0) {
    return { available: false, reason: "No valid working slots configured", nextSlot: null, allSlots: [] };
  }

  // Fetch existing bookings for this doctor on this date
  const bookingsRes = await pool
    .request()
    .input("docId", sql.UniqueIdentifier, doctorId)
    .input("targetDate", sql.Date, cleanDate)
    .query(`
      SELECT appointment_time
      FROM appointments
      WHERE doctor_id = @docId
        AND appointment_date = @targetDate
        AND status NOT IN ('cancelled')
    `);

  const bookedTimes = new Set(
    bookingsRes.recordset.map((b) => normalizeTime(b.appointment_time)).filter(Boolean)
  );

  // Check if targetDate is today to filter out elapsed slots
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isToday = cleanDate === todayStr;
  const currentMins = now.getHours() * 60 + now.getMinutes();

  // Find remaining open slots
  const availableSlots = [];
  for (const slot of generatedSlots) {
    const slotMins = timeToMinutes(slot);
    // If today, slot must not be in the past (allow a 5-min grace period)
    if (isToday && slotMins < currentMins - 5) {
      continue;
    }
    if (!bookedTimes.has(slot)) {
      availableSlots.push(slot);
    }
  }

  const nextSlot = availableSlots.length > 0 ? availableSlots[0] : null;

  return {
    available: nextSlot !== null,
    shift,
    nextSlot,
    nextSlotFormatted: nextSlot ? formatTimeTo12Hour(nextSlot) : null,
    availableSlotsCount: availableSlots.length,
    allSlots: availableSlots,
    totalSlots: generatedSlots.length,
    bookedSlotsCount: bookedTimes.size,
  };
}

/**
 * Get all doctors who are actually available for a specific appointment date.
 * Strictly excludes doctors who:
 * - Are inactive
 * - Have no shift scheduled on that weekday
 * - Are on approved leave
 * - Have zero available slots left for that date
 */
async function getAvailableDoctorsForDate(pool, date) {
  const cleanDate = String(date).slice(0, 10);
  const day = getDayName(cleanDate);
  if (!day) return [];

  const doctorsRes = await pool.request().query(`
    SELECT
      d.id,
      d.full_name,
      d.specialization,
      d.consultation_fee,
      d.availability,
      d.status,
      dept.id AS department_id,
      dept.name AS department_name
    FROM doctors d
    LEFT JOIN departments dept ON dept.id = d.department_id
    WHERE d.status = 'active'
    ORDER BY d.full_name ASC
  `);

  const availableDoctors = [];

  for (const doc of doctorsRes.recordset) {
    const shift = getDoctorShiftForDate(doc.availability, cleanDate);
    if (!shift) continue; // Not scheduled on this weekday

    // Check if on leave
    const onLeave = await isDoctorOnLeave(pool, doc.id, cleanDate);
    if (onLeave) continue;

    // Check next available slot
    const slotInfo = await getNextAvailableAppointmentTime(pool, doc.id, cleanDate);
    if (!slotInfo.available || !slotInfo.nextSlot) {
      continue; // Fully booked or shift has passed
    }

    availableDoctors.push({
      id: doc.id,
      full_name: doc.full_name,
      specialization: doc.specialization,
      consultation_fee: doc.consultation_fee,
      department_id: doc.department_id,
      department_name: doc.department_name,
      shift: slotInfo.shift,
      next_available_time: slotInfo.nextSlot,
      next_available_time_formatted: slotInfo.nextSlotFormatted,
      available_slots_count: slotInfo.availableSlotsCount,
      total_slots: slotInfo.totalSlots,
    });
  }

  return availableDoctors;
}

/**
 * Get upcoming dates on which a specific doctor is actually available (next 30 days)
 * Only returns dates that have an active shift and at least one available slot.
 */
async function getDoctorAvailableDates(pool, doctorId, maxDays = 30) {
  const doctorRes = await pool
    .request()
    .input("docId", sql.UniqueIdentifier, doctorId)
    .query(`
      SELECT id, full_name, availability, status
      FROM doctors
      WHERE id = @docId AND status = 'active'
    `);

  const doctor = doctorRes.recordset[0];
  if (!doctor) return [];

  const schedules = parseDoctorSchedule(doctor.availability);
  const activeDays = new Set(schedules.map((s) => String(s.day || "").toLowerCase()));

  const today = new Date();
  const availableDates = [];

  for (let i = 0; i < maxDays; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dayName = DAY_NAMES[d.getDay()];

    if (!activeDays.has(dayName.toLowerCase())) {
      continue;
    }

    const slotInfo = await getNextAvailableAppointmentTime(pool, doctorId, dateStr);
    if (slotInfo.available && slotInfo.nextSlot) {
      availableDates.push({
        date: dateStr,
        day: dayName,
        formatted_date: d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        shift: slotInfo.shift,
        next_available_time: slotInfo.nextSlot,
        next_available_time_formatted: slotInfo.nextSlotFormatted,
        available_slots_count: slotInfo.availableSlotsCount,
      });
    }
  }

  return availableDates;
}

/**
 * Validate an appointment booking request against doctor schedule, leave, and existing bookings.
 * Returns { valid: true, assignedTime } or { valid: false, error, code }
 */
async function validateAppointmentSlot(pool, doctorId, date, requestedTime = null) {
  const cleanDate = String(date).slice(0, 10);
  const day = getDayName(cleanDate);

  const docRes = await pool
    .request()
    .input("docId", sql.UniqueIdentifier, doctorId)
    .query(`
      SELECT
        d.id,
        d.full_name,
        d.specialization,
        d.availability,
        d.status,
        d.consultation_fee,
        dept.name AS department_name
      FROM doctors d
      LEFT JOIN departments dept ON dept.id = d.department_id
      WHERE d.id = @docId
    `);

  const doctor = docRes.recordset[0];
  if (!doctor) {
    return { valid: false, error: "Doctor not found.", code: 404 };
  }
  if (doctor.status !== "active") {
    return { valid: false, error: "Doctor is currently inactive.", code: 400 };
  }

  const onLeave = await isDoctorOnLeave(pool, doctorId, cleanDate);
  if (onLeave) {
    return { valid: false, error: `${doctor.full_name} is on approved leave on ${cleanDate}.`, code: 400 };
  }

  const shift = getDoctorShiftForDate(doctor.availability, cleanDate);
  if (!shift) {
    return { valid: false, error: `${doctor.full_name} is not scheduled on ${day}.`, code: 400 };
  }

  const slotInfo = await getNextAvailableAppointmentTime(pool, doctorId, cleanDate);
  if (!slotInfo.available || !slotInfo.nextSlot) {
    return { valid: false, error: `No consultation slots are available for ${doctor.full_name} on ${cleanDate}.`, code: 400 };
  }

  let finalTime = requestedTime ? normalizeTime(requestedTime) : slotInfo.nextSlot;

  if (requestedTime) {
    const timeMins = timeToMinutes(finalTime);
    const startMins = timeToMinutes(shift.start_time);
    const endMins = timeToMinutes(shift.end_time);

    if (timeMins < startMins || timeMins >= endMins) {
      return {
        valid: false,
        error: `Requested time ${finalTime} falls outside ${doctor.full_name}'s scheduled shift of ${shift.label}.`,
        code: 400,
      };
    }

    // Check if slot is already occupied
    const occupiedRes = await pool
      .request()
      .input("docId", sql.UniqueIdentifier, doctorId)
      .input("targetDate", sql.Date, cleanDate)
      .input("targetTime", sql.NVarChar, finalTime)
      .query(`
        SELECT TOP 1 id, appointment_code
        FROM appointments
        WHERE doctor_id = @docId
          AND appointment_date = @targetDate
          AND appointment_time = @targetTime
          AND status NOT IN ('cancelled')
      `);

    if (occupiedRes.recordset.length > 0) {
      return {
        valid: false,
        error: `Consultation time ${finalTime} is already booked. Next available time is ${slotInfo.nextSlotFormatted}.`,
        code: 409,
        nextAvailableTime: slotInfo.nextSlot,
      };
    }
  }

  return {
    valid: true,
    doctor,
    shift,
    assignedTime: finalTime,
    assignedTimeFormatted: formatTimeTo12Hour(finalTime),
  };
}

module.exports = {
  getDayName,
  normalizeTime,
  timeToMinutes,
  minutesToTime,
  formatTimeTo12Hour,
  parseDoctorSchedule,
  getDoctorShiftForDate,
  generateTimeSlots,
  isDoctorOnLeave,
  getNextAvailableAppointmentTime,
  getAvailableDoctorsForDate,
  getDoctorAvailableDates,
  validateAppointmentSlot,
};
