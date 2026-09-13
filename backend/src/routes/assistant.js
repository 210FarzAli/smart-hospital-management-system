const express = require("express");
const crypto = require("crypto");
const Groq = require("groq-sdk");

const { sql, getPool } = require("../db");
const {
  askAssistant,
  detectLanguage,
} = require("../utils/anthropic");

const {
  sendAppointmentEmail,
} = require("../utils/notify");

const {
  checkEmergency,
  checkPrescriptionDosageDenial,
  isInteractionQuery,
  handleMedicineInteraction,
  handlePharmacyFlow,
  handleLabFlow,
  parseNaturalDate: parseNaturalDateFromHandler,
} = require("../utils/assistantHandlers");

const router = express.Router();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ============================================================
// SESSION MEMORY
// ============================================================

const sessions = new Map();

const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_HISTORY = 20;

function getSession(sessionToken) {
  const now = Date.now();

  let session = sessions.get(sessionToken);

  if (
    !session ||
    now - session.updatedAt > SESSION_TTL_MS
  ) {
    session = {
      history: [],
      booking: null,
      pharmacyOrder: null,
      labBooking: null,
      customerProfile: {
        name: null,
        phone: null,
        email: null,
        address: null,
      },
      doctorOptions: [],
      doctorSuggestionPending: false,
      updatedAt: now,
    };

    sessions.set(sessionToken, session);
  }

  if (!session.customerProfile) {
    session.customerProfile = {
      name: null,
      phone: null,
      email: null,
      address: null,
    };
  }

  session.updatedAt = now;

  return session;
}

function addHistory(session, role, content) {
  session.history.push({
    role,
    content,
  });

  if (session.history.length > MAX_HISTORY) {
    session.history = session.history.slice(-MAX_HISTORY);
  }

  session.updatedAt = Date.now();
}

// ============================================================
// GENERAL HELPERS
// ============================================================

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"`()[\]{}]/g, " ")
    .replace(/\s+/g, " ");
}

function compactText(value) {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

function generateCode(prefix) {
  return `${prefix}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
}

// ============================================================
// DEPARTMENT ALIASES
// ============================================================

const DEPARTMENT_ALIASES = {
  cardiology: "cardiology",
  cardeology: "cardiology",
  cardiolgy: "cardiology",
  cardilogy: "cardiology",

  neurology: "neurology",
  neurolog: "neurology",
  neorology: "neurology",
  neurolgy: "neurology",

  psychology: "psychology",
  sycology: "psychology",
  psycology: "psychology",
  physcology: "psychology",
  psychlogy: "psychology",
  psycholgy: "psychology",

  dermatology: "dermatology",
  dermatolgy: "dermatology",
  dermatalogy: "dermatology",

  pediatrics: "pediatrics",
  paediatrics: "pediatrics",
  pediatrcs: "pediatrics",

  orthopedics: "orthopedics",
  orthopaedics: "orthopedics",
  orthopedcs: "orthopedics",
  orthopeadics: "orthopedics",

  gynecology: "gynecology",
  gynacology: "gynecology",
  ginecology: "gynecology",
  gynaecology: "gynecology",
  gynecologyy: "gynecology",

  "general medicine": "general medicine",
  generalmedicine: "general medicine",
  generalmedicne: "general medicine",
  generalmedecine: "general medicine",
};

function normalizeDepartmentInput(value) {
  const text = normalizeText(value);
  const compact = compactText(value);

  return (
    DEPARTMENT_ALIASES[compact] ||
    DEPARTMENT_ALIASES[text] ||
    text
  );
}

// ============================================================
// DATE HELPERS
// ============================================================

function formatLocalDate(date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function getPakistanToday() {
  const parts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(new Date());

  const year = Number(
    parts.find((p) => p.type === "year").value
  );

  const month = Number(
    parts.find((p) => p.type === "month").value
  );

  const day = Number(
    parts.find((p) => p.type === "day").value
  );

  return `${year}-${String(month).padStart(
    2,
    "0"
  )}-${String(day).padStart(2, "0")}`;
}

function addDays(dateString, days) {
  const date = new Date(
    `${dateString}T12:00:00`
  );

  date.setDate(date.getDate() + days);

  return formatLocalDate(date);
}

function isValidDateString(value) {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      String(value)
    )
  ) {
    return false;
  }

  const [year, month, day] = String(value)
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  return (
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
  );
}

function getDayName(dateString) {
  const date = new Date(
    `${dateString}T12:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ][date.getDay()];
}

function formatDisplayDate(dateString) {
  const date = new Date(
    `${dateString}T12:00:00`
  );

  return date.toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );
}

// ============================================================
// TIME HELPERS
// ============================================================

function normalizeTime(value) {
  if (!value) return null;

  const text = String(value)
    .trim()
    .toLowerCase();

  const match = text.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/
  );

  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || "00");
  const period = match[3];

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  if (period === "am") {
    if (hours === 12) hours = 0;
  } else if (period === "pm") {
    if (hours !== 12) hours += 12;
  }

  if (hours < 0 || hours > 23) {
    return null;
  }

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(2, "0")}`;
}

function timeToMinutes(value) {
  const normalized = normalizeTime(value);

  if (!normalized) return null;

  const [hours, minutes] = normalized
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function isTimeInsideShift(
  requestedTime,
  startTime,
  endTime
) {
  const requested =
    timeToMinutes(requestedTime);

  const start =
    timeToMinutes(startTime);

  const end =
    timeToMinutes(endTime);

  if (
    requested === null ||
    start === null ||
    end === null
  ) {
    return false;
  }

  return (
    requested >= start &&
    requested <= end
  );
}

function formatTimeForDisplay(value) {
  const normalized = normalizeTime(value);

  if (!normalized) return String(value || "");

  const [hoursString, minutesString] =
    normalized.split(":");

  let hours = Number(hoursString);
  const minutes = Number(minutesString);

  const period =
    hours >= 12 ? "PM" : "AM";

  hours = hours % 12;

  if (hours === 0) hours = 12;

  return `${hours}:${String(minutes).padStart(
    2,
    "0"
  )} ${period}`;
}

function formatShift(
  startTime,
  endTime
) {
  return `${formatTimeForDisplay(
    startTime
  )} – ${formatTimeForDisplay(endTime)}`;
}

// ============================================================
// AVAILABILITY HELPERS
//
// IMPORTANT:
// The hospital uses SHIFT-BASED appointments.
//
// One doctor + one date + one working shift = ONE bookable
// shift.
//
// Multiple patients may book the same shift.
//
// There are NO 30-minute appointment slots.
// Existing appointments DO NOT make the shift unavailable.
// ============================================================

function parseDoctorAvailability(doctor) {
  let schedule = [];

  try {
    schedule = JSON.parse(
      doctor.availability || "[]"
    );

    if (!Array.isArray(schedule)) {
      schedule = [];
    }
  } catch {
    schedule = [];
  }

  return schedule;
}

function getShiftForDate(
  doctor,
  dateString
) {
  const requestedDay =
    getDayName(dateString);

  if (!requestedDay) {
    return null;
  }

  const schedule =
    parseDoctorAvailability(doctor);

  const daySchedule =
    schedule.find(
      (item) =>
        String(item.day || "")
          .toLowerCase() ===
        requestedDay.toLowerCase()
    );

  if (!daySchedule) {
    return null;
  }

  const startTime = normalizeTime(
    daySchedule.start_time
  );

  const endTime = normalizeTime(
    daySchedule.end_time
  );

  if (!startTime || !endTime) {
    return null;
  }

  return {
    day: requestedDay,
    start_time: startTime,
    end_time: endTime,
    label: formatShift(
      startTime,
      endTime
    ),
  };
}

async function getUpcomingAvailableDates(
  pool,
  doctor,
  numberOfDays = 30
) {
  const dates = [];

  const today =
    getPakistanToday();

  for (
    let i = 0;
    i < numberOfDays;
    i++
  ) {
    const date =
      addDays(today, i);

    const shift =
      getShiftForDate(
        doctor,
        date
      );

    if (shift) {
      dates.push({
        date,
        day: shift.day,
        start_time:
          shift.start_time,
        end_time:
          shift.end_time,
        label: shift.label,
      });
    }
  }

  return dates;
}

async function getShiftAvailability(
  pool,
  doctor,
  dateString
) {
  const shift =
    getShiftForDate(
      doctor,
      dateString
    );

  if (!shift) {
    return null;
  }

  return {
    available: true,
    date: dateString,
    day: shift.day,
    start_time:
      shift.start_time,
    end_time:
      shift.end_time,
    label: shift.label,
  };
}

// ============================================================
// DOCTOR LOOKUP
// ============================================================

async function getDoctorsForDepartment(
  pool,
  departmentInput
) {
  const normalizedDepartment =
    normalizeDepartmentInput(
      departmentInput
    );

  const result =
    await pool.request().query(`
      SELECT
        d.id,
        d.full_name,
        d.specialization,
        d.availability,
        d.status,
        d.department_id,
        dep.name AS department_name
      FROM doctors d
      INNER JOIN departments dep
        ON dep.id = d.department_id
      WHERE d.status = 'active'
      ORDER BY d.full_name
    `);

  return result.recordset.filter(
    (doctor) =>
      normalizeDepartmentInput(
        doctor.department_name
      ) === normalizedDepartment
  );
}

function doctorNameMatches(
  doctor,
  nameInput
) {
  if (!nameInput) return false;

  const doctorName =
    compactText(
      doctor.full_name
    );

  const inputName =
    compactText(nameInput);

  if (!inputName) return false;

  return (
    doctorName === inputName ||
    doctorName.includes(inputName) ||
    inputName.includes(doctorName)
  );
}

async function findDoctorCandidates(
  pool,
  doctorInput,
  departmentInput
) {
  const result =
    await pool.request().query(`
      SELECT
        d.id,
        d.full_name,
        d.specialization,
        d.availability,
        d.status,
        d.department_id,
        dep.name AS department_name
      FROM doctors d
      INNER JOIN departments dep
        ON dep.id = d.department_id
      WHERE d.status = 'active'
      ORDER BY d.full_name
    `);

  let doctors =
    result.recordset;

  if (departmentInput) {
    const normalizedDepartment =
      normalizeDepartmentInput(
        departmentInput
      );

    doctors =
      doctors.filter(
        (doctor) =>
          normalizeDepartmentInput(
            doctor.department_name
          ) ===
          normalizedDepartment
      );
  }

  if (!doctorInput) {
    return doctors;
  }

  return doctors.filter(
    (doctor) =>
      doctorNameMatches(
        doctor,
        doctorInput
      )
  );
}
// ============================================================
// ALL ACTIVE DOCTORS
// ============================================================

async function getAllActiveDoctors(pool) {
  const result =
    await pool.request().query(`
      SELECT
        d.id,
        d.full_name,
        d.specialization,
        d.availability,
        d.status,
        d.department_id,
        dep.name AS department_name
      FROM doctors d
      INNER JOIN departments dep
        ON dep.id = d.department_id
      WHERE d.status = 'active'
      ORDER BY d.full_name, dep.name
    `);

  return result.recordset;
}

// ============================================================
// DETECT DOCTOR NAME DIRECTLY FROM USER MESSAGE
//
// Examples:
// "book Dr Amna"
// "I want Dr Amna Siddiqui"
// "book Amna in cardiology"
// ============================================================

async function findDoctorsMentionedInMessage(
  pool,
  message,
  department
) {
  const doctors =
    await getAllActiveDoctors(pool);

  const text =
    normalizeText(message);

  const departmentNormalized =
    department
      ? normalizeDepartmentInput(
          department
        )
      : null;

  const matches =
    doctors.filter((doctor) => {
      const fullName =
        normalizeText(
          doctor.full_name
        );

      const nameWithoutDr =
        fullName.replace(
          /^dr\s+/,
          ""
        );

      const fullCompact =
        compactText(
          nameWithoutDr
        );

      if (
        !fullCompact ||
        fullCompact.length < 3
      ) {
        return false;
      }

      const mentioned =
        text.includes(
          nameWithoutDr
        ) ||
        text.includes(
          fullName
        ) ||
        text.includes(
          fullCompact
        );

      if (!mentioned) {
        return false;
      }

      if (!departmentNormalized) {
        return true;
      }

      return (
        normalizeDepartmentInput(
          doctor.department_name
        ) ===
        departmentNormalized
      );
    });

  return matches;
}
// ============================================================
// DOCTOR DISPLAY
// ============================================================

// ============================================================
// DEPARTMENT LIST
// ============================================================

function isDepartmentListQuestion(message) {
  const text = normalizeText(message);

  const hasDepartmentWord =
    /\bdepartment\b/.test(text) ||
    /\bdepartments\b/.test(text);

  const hasListQuestion =
    /\bwhich\b/.test(text) ||
    /\bwhat\b/.test(text) ||
    /\bshow\b/.test(text) ||
    /\blist\b/.test(text) ||
    /\bavailable\b/.test(text);

  const hasRomanUrduQuestion =
    text.includes("kon se department") ||
    text.includes("kon sa department") ||
    text.includes("konsay department") ||
    text.includes("kaun se department") ||
    text.includes("kaun sa department") ||
    text.includes("department available");

  return (
    (hasDepartmentWord &&
      hasListQuestion) ||
    hasRomanUrduQuestion
  );
}


async function getAvailableDepartments(pool) {
  const result =
    await pool.request().query(`
      SELECT DISTINCT
        dep.id,
        dep.name
      FROM departments dep
      INNER JOIN doctors d
        ON d.department_id = dep.id
      WHERE dep.status = 'active'
  AND d.status = 'active'
      ORDER BY dep.name
    `);

  return result.recordset;
}


function formatDepartments(
  departments,
  language = "english"
) {
  if (!departments.length) {
    if (language === "urdu") {
      return "اس وقت کوئی department available نہیں ہے۔";
    }

    if (language === "roman_urdu") {
      return "Is waqt koi department available nahi hai.";
    }

    return "There are currently no departments available for appointments.";
  }

  const lines =
    departments.map(
      (department, index) =>
        `${index + 1}. ${department.name}`
    );

  if (language === "urdu") {
    return `یہ departments appointment کے لیے available ہیں:

${lines.join("\n")}

براہِ کرم کسی department کا نام بتائیں۔`;
  }

  if (language === "roman_urdu") {
    return `Yeh departments appointment ke liye available hain:

${lines.join("\n")}

Please kisi department ka naam batayein.`;
  }

  return `These departments are available for appointments:

${lines.join("\n")}

Please tell me the department you would like to choose.`;
}

function formatDoctors(
  doctors,
  language = "english"
) {
  if (!doctors.length) {
    return language === "urdu"
      ? "کوئی active doctor نہیں ملا۔"
      : language === "roman_urdu"
      ? "Koi active doctor nahi mila."
      : "I couldn't find any active doctors.";
  }

  const lines =
    doctors.map(
      (doctor, index) => {
        const rawName =
          String(
            doctor.full_name || ""
          ).trim();

        // Remove any existing Dr. / Dr prefix
        // so we never show "Dr. Dr. Ayesha Khan"
        const cleanName =
          rawName.replace(
            /^(dr\.?\s*)+/i,
            ""
          ).trim();

        const displayName =
          `Dr. ${cleanName}`;

        return `${index + 1}. ${displayName} — ${
          doctor.specialization ||
          "General"
        } — ${
          doctor.department_name ||
          ""
        }`;
      }
    );

  if (
    language === "urdu"
  ) {
    return `یہ doctors available ہیں:\n\n${lines.join(
      "\n"
    )}\n\nبراہِ کرم doctor کا نام یا نمبر بتائیں۔`;
  }

  if (
    language === "roman_urdu"
  ) {
    return `Yeh doctors available hain:\n\n${lines.join(
      "\n"
    )}\n\nPlease doctor ka naam ya number batayein.`;
  }

  return `These doctors are available:\n\n${lines.join(
    "\n"
  )}\n\nPlease tell me the doctor name or number.`;
}

// ============================================================
// LANGUAGE / RESPONSE HELPERS
// ============================================================

function askDepartmentOrDoctor(
  language
) {
  if (language === "urdu") {
    return "براہِ کرم department یا doctor کا نام بتائیں تاکہ میں appointment booking شروع کر سکوں۔";
  }

  if (
    language === "roman_urdu"
  ) {
    return "Please department ya doctor ka naam batayein taa-ke main appointment booking start kar sakun.";
  }

  return "Please tell me the department or doctor's name so I can start the appointment booking.";
}

function askPatientInformation(
  language
) {
  if (language === "urdu") {
    return "Appointment continue کرنے کے لیے اپنا پورا نام، عمر، فون نمبر اور email address ایک ساتھ بھیج دیں۔";
  }

  if (
    language === "roman_urdu"
  ) {
    return "Appointment continue karne ke liye apna poora naam, age, phone number aur email address ek sath bhej dein.";
  }

  return "To continue the appointment, please provide your full name, age, phone number, and email address together.";
}

function askReason(
  language
) {
  if (language === "urdu") {
    return "Appointment کی مختصر وجہ بتا دیں۔ اگر وجہ نہیں بتانا چاہتے تو simply 'skip' کہہ دیں۔";
  }

  if (
    language === "roman_urdu"
  ) {
    return "Appointment ki short reason bata dein. Agar reason nahi batana chahte to simply 'skip' keh dein.";
  }

  return "Please provide a short reason for the appointment. If you don't want to provide one, simply say 'skip'.";
}

function doesNotWantReason(
  message
) {
  const text =
    normalizeText(message);

  return [
    "skip",
    "no reason",
    "no",
    "none",
    "not provided",
    "don't want",
    "do not want",
    "nothing",
    "kuch nahi",
    "reason nahi",
    "reason nahi dena",
    "nahi",
  ].some(
    (phrase) =>
      text === phrase ||
      text.includes(phrase)
  );
}

function isConfirmationMessage(
  message
) {
  const text =
    normalizeText(message);

  return [
    "yes",
    "yeah",
    "yep",
    "ok",
    "okay",
    "confirm",
    "confirmed",
    "book it",
    "book",
    "please book",
    "do it",
    "haan",
    "han",
    "jee",
    "ji",
    "theek",
    "thik",
    "kar dein",
    "book kar dein",
    "haan book kar dein",
  ].some(
    (phrase) =>
      text === phrase ||
      text.includes(phrase)
  );
}

// ============================================================
// DATE PARSING
// ============================================================

function parseNaturalDate(
  message
) {
  const handlerParsed = parseNaturalDateFromHandler(message);
  if (handlerParsed) {
    return handlerParsed;
  }

  const text =
    normalizeText(message);

  const today =
    getPakistanToday();

  // Today
  if (
    /\btoday\b/.test(text) ||
    /\baaj\b/.test(text)
  ) {
    return today;
  }

  // Tomorrow
  if (
    /\btomorrow\b/.test(text) ||
    /\bkal\b/.test(text)
  ) {
    return addDays(
      today,
      1
    );
  }

  const weekdays = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  for (
    const [dayName, targetDay] of Object.entries(
      weekdays
    )
  ) {
    if (
      text.includes(dayName) ||
      text.includes(
        dayName.slice(0, 3)
      )
    ) {
      const current =
        new Date(
          `${today}T12:00:00`
        );

      const currentDay =
        current.getDay();

      let difference =
        targetDay -
        currentDay;

      if (difference < 0) {
        difference += 7;
      }

      return addDays(
        today,
        difference
      );
    }
  }

  // YYYY-MM-DD
  const isoMatch =
    text.match(
      /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/
    );

  if (isoMatch) {
    const value =
      `${isoMatch[1]}-${String(
        Number(isoMatch[2])
      ).padStart(
        2,
        "0"
      )}-${String(
        Number(isoMatch[3])
      ).padStart(
        2,
        "0"
      )}`;

    if (
      isValidDateString(
        value
      )
    ) {
      return value;
    }
  }

  return null;
}

// ============================================================
// NATURAL TIME PARSING
// ============================================================

function parseNaturalTime(
  message
) {
  const text =
    String(message || "")
      .toLowerCase()
      .trim();

  // ==========================================================
  // 12-HOUR TIME
  //
  // Examples:
  // 9 AM
  // 9:30 AM
  // 12 PM
  // 2:45 pm
  //
  // IMPORTANT:
  // This only matches a number immediately followed by
  // AM/PM, so words such as "time" or "monday" are ignored.
  // ==========================================================

  const amPmMatch =
    text.match(
      /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i
    );

  if (amPmMatch) {
    let hours =
      Number(amPmMatch[1]);

    const minutes =
      Number(
        amPmMatch[2] || "00"
      );

    const period =
      amPmMatch[3].toLowerCase();

    if (
      hours >= 1 &&
      hours <= 12 &&
      minutes >= 0 &&
      minutes <= 59
    ) {
      if (
        period === "am"
      ) {
        if (hours === 12) {
          hours = 0;
        }
      } else {
        if (hours !== 12) {
          hours += 12;
        }
      }

      return normalizeTime(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
      );
    }
  }

  // ==========================================================
  // 24-HOUR TIME
  //
  // Examples:
  // 09:00
  // 14:30
  // 17:00
  //
  // Requires the colon so ordinary numbers such as age,
  // dates, etc. are NOT interpreted as appointment times.
  // ==========================================================

  const twentyFourHourMatch =
    text.match(
      /\b([01]\d|2[0-3]):([0-5]\d)\b/
    );

  if (
    twentyFourHourMatch
  ) {
    return normalizeTime(
      `${twentyFourHourMatch[1]}:${twentyFourHourMatch[2]}`
    );
  }

  // ==========================================================
  // NO ACTUAL TIME FOUND
  // ==========================================================

  return null;
}

// ============================================================
// AVAILABILITY QUESTIONS
// ============================================================

function isDateAvailabilityQuestion(
  message
) {
  const text =
    normalizeText(message);

  return [
    "when is",
    "when are",
    "available dates",
    "available day",
    "which days",
    "what days",
    "availability",
    "kab available",
    "kis din",
    "kon se din",
    "kaun se din",
    "available kab",
  ].some(
    (phrase) =>
      text.includes(phrase)
  );
}

function isTimeAvailabilityQuestion(
  message
) {
  const text =
    normalizeText(message);

  return [
    "what time",
    "which time",
    "available time",
    "available times",
    "timings",
    "timing",
    "what are the timings",
    "kis waqt",
    "kitne baje",
    "time kya",
    "timing kya",
  ].some(
    (phrase) =>
      text.includes(phrase)
  );
}

// ============================================================
// AVAILABILITY RESPONSE FORMATTERS
// ============================================================

function formatAvailabilityMessage(
  doctor,
  dates,
  language
) {
  // ----------------------------------------------------------
  // Prevent duplicate weekly shifts.
  //
  // getUpcomingAvailableDates() checks the next 30 days,
  // so the same Monday/Wednesday/Friday schedule can appear
  // several times. We only want to show each unique shift once.
  // ----------------------------------------------------------

  const uniqueShifts = [];
  const seen = new Set();

  for (const item of dates) {
    const key =
      `${item.day}|${item.start_time}|${item.end_time}`;

    if (!seen.has(key)) {
      seen.add(key);
      uniqueShifts.push(item);
    }
  }

  // ----------------------------------------------------------
  // Sort the weekly schedule:
  // Monday → Tuesday → Wednesday → Thursday → Friday → ...
  // ----------------------------------------------------------

  const dayOrder = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 7,
  };

  uniqueShifts.sort(
    (a, b) =>
      (dayOrder[a.day] || 99) -
      (dayOrder[b.day] || 99)
  );

  const limited =
    uniqueShifts.slice(0, 10);

  const lines =
    limited.map(
      (item) =>
        `${item.day} — ${formatShift(
          item.start_time,
          item.end_time
        )}`
    );

  // ----------------------------------------------------------
  // Remove duplicate "Dr."
  // ----------------------------------------------------------

  const rawDoctorName =
    String(doctor.full_name || "").trim();

  const doctorName =
    rawDoctorName.replace(
      /^(dr\.?\s*)+/i,
      ""
    );

  const displayDoctorName =
    `Dr. ${doctorName}`;

  // ----------------------------------------------------------
  // Urdu
  // ----------------------------------------------------------

  if (
    language === "urdu"
  ) {
    return `${displayDoctorName} کی available shifts:\n\n${lines.join(
      "\n"
    )}\n\nآپ کسی بھی available date کا انتخاب کر سکتے ہیں۔`;
  }

  // ----------------------------------------------------------
  // Roman Urdu
  // ----------------------------------------------------------

  if (
    language === "roman_urdu"
  ) {
    return `${displayDoctorName} ki available shifts:\n\n${lines.join(
      "\n"
    )}\n\nAap kisi bhi available date ka intikhab kar sakte hain.`;
  }

  // ----------------------------------------------------------
  // English
  // ----------------------------------------------------------

  return `Available shifts for ${displayDoctorName}:\n\n${lines.join(
    "\n"
  )}\n\nYou can choose any available date.`;
}

function formatAvailableShiftMessage(
  doctor,
  dateString,
  shift,
  language
) {
  const dateText =
    formatDisplayDate(
      dateString
    );

  const shiftText =
    formatShift(
      shift.start_time,
      shift.end_time
    );

  const rawDoctorName =
    String(doctor.full_name || "").trim();

  const doctorName =
    rawDoctorName.replace(
      /^(dr\.?\s*)+/i,
      ""
    );

  const displayDoctorName =
    `Dr. ${doctorName}`;

  if (
    language === "urdu"
  ) {
    return `${displayDoctorName} ${dateText} کو available ہیں۔\n\nDoctor's Shift: ${shiftText}\n\nیہ پورا shift ایک bookable appointment shift ہے۔ آپ کو exact consultation time منتخب کرنے کی ضرورت نہیں ہے۔`;
  }

  if (
    language === "roman_urdu"
  ) {
    return `${displayDoctorName} ${dateText} ko available hain.\n\nDoctor's Shift: ${shiftText}\n\nYeh poora shift ek bookable appointment shift hai. Aap ko exact consultation time select karne ki zaroorat nahi hai.`;
  }

  return `${displayDoctorName} is available on ${dateText}.\n\nDoctor's Shift: ${shiftText}\n\nThis entire shift is one bookable appointment shift. You do not need to select an exact consultation time.`;
}

function formatUnavailableDateMessage(
  doctor,
  dateString,
  dates,
  language
) {
  const dateText =
    formatDisplayDate(
      dateString
    );

  const alternatives =
    dates
      .slice(0, 7)
      .map(
        (item) =>
          `${item.day} — ${formatShift(
            item.start_time,
            item.end_time
          )}`
      )
      .join("\n");

  if (
    language === "urdu"
  ) {
    return `${doctor.full_name} ${dateText} کو کام نہیں کرتے۔\n\nAvailable shifts:\n${alternatives}`;
  }

  if (
    language === "roman_urdu"
  ) {
    return `${doctor.full_name} ${dateText} ko kaam nahi karte.\n\nAvailable shifts:\n${alternatives}`;
  }

  return `Dr. ${doctor.full_name} does not work on ${dateText}.\n\nAvailable shifts:\n${alternatives}`;
}

// ============================================================
// MAIN SHIFT VALIDATION
// ============================================================

function validateRequestedShiftTime(
  doctor,
  dateString,
  requestedTime
) {
  const shift =
    getShiftForDate(
      doctor,
      dateString
    );

  if (!shift) {
    return {
      valid: false,
      shift: null,
      reason: "date_unavailable",
    };
  }

  if (!requestedTime) {
    return {
      valid: true,
      shift,
      reason: null,
    };
  }

  const normalized =
    normalizeTime(
      requestedTime
    );

  if (!normalized) {
    return {
      valid: false,
      shift,
      reason: "invalid_time",
    };
  }

  if (
    !isTimeInsideShift(
      normalized,
      shift.start_time,
      shift.end_time
    )
  ) {
    return {
      valid: false,
      shift,
      reason: "outside_shift",
    };
  }

  return {
    valid: true,
    shift,
    reason: null,
  };
}

// ============================================================
// GENERATE SHORT CODES
// ============================================================

function shortCode(prefix) {
  return `${prefix}-${Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase()}`;
}
// ============================================================
// FIND DEPARTMENT
// ============================================================

async function findDepartment(
  pool,
  value
) {
  if (!value) {
    return null;
  }

  const departments =
    await pool.request().query(`
      SELECT id, name
      FROM departments
      ORDER BY name
    `);

  const normalized =
    normalizeDepartmentInput(
      value
    );

  const exact =
    departments.recordset.find(
      (department) =>
        normalizeDepartmentInput(
          department.name
        ) === normalized
    );

  if (exact) {
    return exact;
  }

  const partial =
    departments.recordset.find(
      (department) =>
        normalizeText(
          department.name
        ).includes(normalized) ||
        normalized.includes(
          normalizeText(
            department.name
          )
        )
    );

  return partial || null;
}
// ============================================================
// INTENT DETECTION
// ============================================================

function isBookingIntent(message) {
  const text = normalizeText(message);

  return (
    /\b(book|booking|appointment|appoint)\b/.test(text) ||
    /\bsee a doctor\b/.test(text) ||
    /\bvisit a doctor\b/.test(text) ||
    /\bconsult a doctor\b/.test(text) ||
    /\bwant a doctor\b/.test(text)
  );
}

function isDoctorListQuestion(message) {
  const text = normalizeText(message);

  return (
    (
      /\bwhich\b/.test(text) ||
      /\bwhat\b/.test(text) ||
      /\bshow\b/.test(text) ||
      /\blist\b/.test(text) ||
      /\bavailable\b/.test(text)
    ) &&
    (
      /\bdoctor\b/.test(text) ||
      /\bdoctors\b/.test(text)
    )
  );
}

// ============================================================
// DOCTOR SUGGESTION REQUEST
//
// This is different from:
// "which doctors are available?"
//
// Flow:
// User: "doctor suggest karo"
// AI: "Aap ko kya symptoms ho rahe hain?"
// User: "mujhe sar mein dard aur chakkar hain"
// AI: checks hospital doctors and suggests an appropriate doctor.
// ============================================================

function isDoctorSuggestionRequest(message) {
  const text = normalizeText(message);

  return (
    /\bsuggest\b.*\bdoctor\b/.test(text) ||
    /\brecommend\b.*\bdoctor\b/.test(text) ||
    /\bdoctor\b.*\bsuggest\b/.test(text) ||
    /\bdoctor\b.*\brecommend\b/.test(text) ||
    /\bwhich doctor\b/.test(text) ||
    /\bwhat doctor\b/.test(text) ||
    /\bdoctor for my symptoms\b/.test(text) ||
    /\bdoctor for these symptoms\b/.test(text) ||
    text.includes("doctor suggest karo") ||
    text.includes("doctor recommend karo") ||
    text.includes("doctor batao") ||
    text.includes("doctor batayein") ||
    text.includes("kis doctor") ||
    text.includes("kon sa doctor") ||
    text.includes("kaun sa doctor")
  );
}

// ============================================================
// SUGGEST DOCTOR BASED ON SYMPTOMS
//
// The AI only routes the patient to an existing hospital
// doctor. It does NOT diagnose or prescribe medicine.
// ============================================================

async function suggestDoctorForSymptoms(
  pool,
  symptoms,
  language,
  session
) {
  const doctorsResult =
    await pool.request().query(`
      SELECT
        d.id,
        d.full_name,
        d.specialization,
        d.department_id,
        dep.name AS department_name
      FROM doctors d
      INNER JOIN departments dep
        ON dep.id = d.department_id
      WHERE d.status = 'active'
        AND dep.status = 'active'
      ORDER BY d.full_name
    `);

  const doctors =
    doctorsResult.recordset;

  if (!doctors.length) {
    if (language === "urdu") {
      return "اس وقت کوئی active doctor available نہیں ہے۔";
    }

    if (language === "roman_urdu") {
      return "Is waqt koi active doctor available nahi hai.";
    }

    return "There are currently no active doctors available.";
  }

  const doctorOptions =
    doctors
      .map(
        (doctor, index) =>
          `${index + 1}. ${doctor.full_name} | Specialization: ${
            doctor.specialization || "General"
          } | Department: ${
            doctor.department_name || "General"
          }`
      )
      .join("\n");

  const prompt = `
You are helping route a hospital patient to an appropriate EXISTING doctor.

This is NOT a diagnosis.
Do NOT recommend medicines.
Do NOT prescribe treatment.

Patient symptoms:
${symptoms}

Available hospital doctors:
${doctorOptions}

Choose the most appropriate doctor ONLY from the doctors listed above.

Return ONLY valid JSON:

{
  "doctor_number": number,
  "reason": "short explanation"
}

The reason must be a simple routing explanation such as:
"This doctor specializes in conditions commonly related to these symptoms."

Do not invent doctors.
Do not invent departments.
`;

  try {
    const completion =
      await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        temperature: 0.1,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content:
              "You are a hospital doctor-routing assistant. Return valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

    const content =
      completion.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(
        "No doctor suggestion returned."
      );
    }

    const result =
      JSON.parse(content);

    const index =
      Number(result.doctor_number) - 1;

    const doctor =
      doctors[index];

    if (!doctor) {
      throw new Error(
        "Invalid doctor selected by AI."
      );
    }

    // ============================================================
// SAVE THE SUGGESTED DOCTOR INTO THE CURRENT BOOKING
//
// This allows the patient to say:
// "ok book my appointment"
//
// without having to select the doctor again.
// ============================================================

session.booking = mergeBooking(
  session.booking,
  {
    doctor_id: doctor.id,
    doctor_name: doctor.full_name,
    department: doctor.department_name,
  }
);

session.doctorOptions = [];

    const cleanName =
      String(
        doctor.full_name || ""
      )
        .replace(
          /^(dr\.?\s*)+/i,
          ""
        )
        .trim();

    const displayName =
      `Dr. ${cleanName}`;

    if (language === "urdu") {
      return `آپ کی بتائی ہوئی علامات کی بنیاد پر میں تجویز کروں گا کہ آپ ${displayName} سے رجوع کریں۔

Specialization: ${doctor.specialization || "General"}
Department: ${doctor.department_name || "General"}

یہ صرف عمومی doctor-routing guidance ہے، حتمی medical evaluation doctor کرے گا۔`;
    }

    if (language === "roman_urdu") {
      return `Aap ki batayi hui symptoms ki bunyaad par main suggest karunga ke aap ${displayName} se consult karein.

Specialization: ${doctor.specialization || "General"}
Department: ${doctor.department_name || "General"}

Yeh sirf general doctor-routing guidance hai. Final medical evaluation doctor karega.`;
    }

    return `Based on the symptoms you described, I suggest consulting ${displayName}.

Specialization: ${doctor.specialization || "General"}
Department: ${doctor.department_name || "General"}

This is general doctor-routing guidance. The doctor should perform the final medical evaluation.`;
  } catch (error) {
    console.error(
      "Doctor suggestion error:",
      error.message
    );

    if (language === "urdu") {
      return "میں آپ کی علامات کے لیے مناسب doctor منتخب نہیں کر سکا۔ براہِ کرم اپنی علامات تھوڑی مزید تفصیل سے بتائیں۔";
    }

    if (language === "roman_urdu") {
      return "Main aap ki symptoms ke liye suitable doctor select nahi kar saka. Please apni symptoms thori detail mein batayein.";
    }

    return "I could not determine the most appropriate doctor yet. Please describe your symptoms in a little more detail.";
  }
}

// ============================================================
// SELECT DOCTOR FROM OPTIONS
// ============================================================

function selectDoctorFromOptions(
  message,
  options
) {
  const text = normalizeText(message);

  // User selected by number:
  // "1", "2", "doctor 1", "number 2"
  const numberMatch = text.match(
    /\b(?:doctor\s*)?(?:number\s*)?([1-9]\d*)\b/
  );

  if (numberMatch) {
    const index =
      Number(numberMatch[1]) - 1;

    if (
      index >= 0 &&
      index < options.length
    ) {
      return options[index];
    }
  }

  // User selected by doctor name
  const matches = options.filter(
    (doctor) =>
      doctorNameMatches(
        doctor,
        message
      )
  );

  if (matches.length === 1) {
    return matches[0];
  }

  return null;
}

// ============================================================
// BOOKING EXTRACTION
// ============================================================

async function extractBookingDetails(
  history,
  message
) {
  const recentHistory =
    history
      .slice(-14)
      .map(
        (item) =>
          `${item.role}: ${item.content}`
      )
      .join("\n");

  const today =
    getPakistanToday();

  const prompt = `
You extract appointment information for a hospital booking assistant.

Return ONLY valid JSON.

{
  "intent": "booking" | "not_booking",
  "full_name": string | null,
  "age": number | null,
  "phone": string | null,
  "email": string | null,
  "department": string | null,
  "doctor_name": string | null,
  "preferred_date": "YYYY-MM-DD" | null,
  "preferred_time": "HH:MM" | null,
  "reason": string | null,
  "asking_available_date": boolean,
  "asking_available_time": boolean,
  "confirmation": boolean
}

Today in Pakistan is ${today}.

IMPORTANT APPOINTMENT RULE:

The hospital uses SHIFT-BASED appointments.

A doctor's entire working shift on a date is ONE bookable appointment shift.

Example:
Monday 09:00 - 17:00

This means:
Monday shift = 09:00 - 17:00

Multiple patients can book this same shift.

There are NO 30-minute appointment slots.

If the user says:
"Book Dr Amna Monday"
extract:
doctor_name = "Amna"
preferred_date = the upcoming Monday
preferred_time = null

If the user says:
"Book Dr Amna Monday at 9 AM"
extract:
doctor_name = "Amna"
preferred_date = the upcoming Monday
preferred_time = "09:00"

The time is ONLY used to identify/check that the requested time falls inside the doctor's shift.

It is NOT an exact consultation time.

If the user says:
"Book Dr Amna Monday at 12 PM"
extract:
preferred_time = "12:00"

If the user says:
"Book Dr Amna Monday at 8 PM"
extract:
preferred_time = "20:00"

Never drop a time explicitly provided by the user.

Examples:

"Monday at 9 AM"
=> date = upcoming Monday
=> time = "09:00"

"Monday 9 AM"
=> date = upcoming Monday
=> time = "09:00"

"Wednesday at 2 PM"
=> date = upcoming Wednesday
=> time = "14:00"

"tomorrow at 10 AM"
=> date = tomorrow
=> time = "10:00"

"14:30 Monday"
=> date = upcoming Monday
=> time = "14:30"

If the user says:
"I want to book a doctor"
then:
intent = "booking"

If the user says:
"which doctors are available"
then:
asking_available_date = false
asking_available_time = false

If the user says:
"which date is available"
then:
asking_available_date = true

If the user says:
"which time is available"
then:
asking_available_time = true

If the user says:
"yes book it"
then:
confirmation = true

If the user gives:
"Dr Amna"
then:
doctor_name = "Amna"

Do not invent information.

IMPORTANT INTENT RULE:

Determine "intent" ONLY from the CURRENT USER MESSAGE.

Do NOT mark the current message as "booking" merely because
previous messages were about appointment booking.

For example:

Previous conversation:
User: I want to book an appointment
Assistant: Please tell me the department.

Current user message:
"mujhey sar main dard ho raha hey"

The correct result is:

"intent": "not_booking"

because the current message is a health/symptom message.

Another example:

Previous conversation:
User: I want to book an appointment
Assistant: Please tell me the department.

Current user message:
"Cardiology"

The correct result is:

"intent": "booking"

because the user is continuing the appointment selection.

Another example:

Current user message:
"what are the symptoms of flu"

The correct result is:

"intent": "not_booking"

Conversation:
${recentHistory || "(none)"}

Current user message:
${message}
`;

  let result = {};

  try {
    const completion =
      await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        temperature: 0.1,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content:
              "Extract appointment information only. Return valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

    const content =
      completion.choices?.[0]?.message
        ?.content;

    if (content) {
      result =
        JSON.parse(content);
    }
  } catch (error) {
    console.error(
      "Groq extraction error:",
      error.message
    );
  }

  // Local date parser has priority.
  const explicitDate =
    parseNaturalDate(message);

  if (explicitDate) {
    result.preferred_date =
      explicitDate;
  }

  // Local time parser has priority.
  const explicitTime =
    parseNaturalTime(message);

  if (explicitTime) {
    result.preferred_time =
      explicitTime;
  }

  return result;
}

// ============================================================
// MERGE BOOKING DATA
// ============================================================

function mergeBooking(
  existing,
  extracted
) {
  const booking = {
    ...(existing || {}),
  };

  const fields = [
    "full_name",
    "age",
    "phone",
    "email",
    "department",
    "doctor_name",
    "doctor_id",
    "preferred_date",
    "preferred_time",
    "reason",
  ];

  for (const field of fields) {
    if (
      extracted[field] !== null &&
      extracted[field] !== undefined &&
      extracted[field] !== ""
    ) {
      booking[field] =
        extracted[field];
    }
  }

  return booking;
}

// ============================================================
// CREATE APPOINTMENT
//
// SHIFT MODEL:
//
// The patient books the entire doctor's shift.
//
// There is NO exact-time conflict check.
//
// appointment_time in SQL stores the SHIFT START only.
// ============================================================

async function createAppointment(
  pool,
  booking,
  doctor
) {
  if (!booking.preferred_date) {
    return {
      success: false,
      error: "date_required",
    };
  }

  const shift =
    getShiftForDate(
      doctor,
      booking.preferred_date
    );

  if (!shift) {
    return {
      success: false,
      error: "date_unavailable",
    };
  }

  // If the user supplied a time, use it only to identify
  // the shift. Never store it as the consultation time.
  if (booking.preferred_time) {
    const requestedTime =
      normalizeTime(
        booking.preferred_time
      );

    if (!requestedTime) {
      return {
        success: false,
        error: "invalid_time",
      };
    }

    if (
      !isTimeWithinShift(
        requestedTime,
        shift
      )
    ) {
      return {
        success: false,
        error: "outside_shift",
        shift,
      };
    }
  }

  // Always store the shift START in the old database field.
  const storedAppointmentTime =
    shift.start_time;

  // ==========================================================
  // FIND EXISTING PATIENT
  // ==========================================================

  const patientLookup =
    await pool
      .request()
      .input(
        "email",
        sql.NVarChar,
        booking.email
      )
      .input(
        "phone",
        sql.NVarChar,
        booking.phone
      )
      .query(`
        SELECT TOP 1 *
        FROM patients
        WHERE email = @email
           OR phone = @phone
        ORDER BY created_at DESC
      `);

  let patient =
    patientLookup.recordset[0];

  // ==========================================================
  // UPDATE EXISTING PATIENT
  // ==========================================================

  if (patient) {
    const updated =
      await pool
        .request()
        .input(
          "id",
          sql.UniqueIdentifier,
          patient.id
        )
        .input(
          "full_name",
          sql.NVarChar,
          booking.full_name
        )
        .input(
          "age",
          sql.Int,
          Number(booking.age)
        )
        .input(
          "phone",
          sql.NVarChar,
          booking.phone
        )
        .input(
          "email",
          sql.NVarChar,
          booking.email
        )
        .query(`
          UPDATE patients
          SET
            full_name = @full_name,
            age = @age,
            phone = @phone,
            email = @email
          OUTPUT INSERTED.*
          WHERE id = @id
        `);

    patient =
      updated.recordset[0];
  }

  // ==========================================================
  // CREATE NEW PATIENT
  // ==========================================================

  if (!patient) {
    const created =
      await pool
        .request()
        .input(
          "patient_code",
          sql.NVarChar,
          shortCode("P")
        )
        .input(
          "full_name",
          sql.NVarChar,
          booking.full_name
        )
        .input(
          "age",
          sql.Int,
          Number(booking.age)
        )
        .input(
          "phone",
          sql.NVarChar,
          booking.phone
        )
        .input(
          "email",
          sql.NVarChar,
          booking.email
        )
        .query(`
          INSERT INTO patients
          (
            patient_code,
            full_name,
            age,
            phone,
            email
          )
          OUTPUT INSERTED.*
          VALUES
          (
            @patient_code,
            @full_name,
            @age,
            @phone,
            @email
          )
        `);

    patient =
      created.recordset[0];
  }

  // ==========================================================
  // CREATE APPOINTMENT
  //
  // IMPORTANT:
  // No existing appointment lookup happens here.
  //
  // Multiple patients can book the same doctor/date/shift.
  // ==========================================================

  const appointmentResult =
    await pool
      .request()
      .input(
        "appointment_code",
        sql.NVarChar,
        shortCode("A")
      )
      .input(
        "patient_id",
        sql.UniqueIdentifier,
        patient.id
      )
      .input(
        "doctor_id",
        sql.UniqueIdentifier,
        doctor.id
      )
      .input(
        "appointment_date",
        sql.Date,
        booking.preferred_date
      )
      .input(
        "appointment_time",
        sql.NVarChar,
        storedAppointmentTime
      )
      .input(
        "reason",
        sql.NVarChar,
        booking.reason ||
          "Not provided"
      )
      .query(`
        INSERT INTO appointments
        (
          appointment_code,
          patient_id,
          doctor_id,
          appointment_date,
          appointment_time,
          reason,
          status
        )
        OUTPUT INSERTED.*
        VALUES
        (
          @appointment_code,
          @patient_id,
          @doctor_id,
          @appointment_date,
          @appointment_time,
          @reason,
          'confirmed'
        )
      `);

  const appointment =
    appointmentResult.recordset[0];

  // ==========================================================
  // EMAIL
  // ==========================================================

  const emailResult =
    await sendAppointmentEmail({
      patient,
      doctor,
      department: {
        name:
          doctor.department_name,
      },
      appointment: {
        ...appointment,
        shift_start:
          shift.start_time,
        shift_end:
          shift.end_time,
        shift_label:
          shift.label,
      },
    });

  // ==========================================================
  // NOTIFICATION RECORD
  // ==========================================================

  try {
    await pool
      .request()
      .input(
        "appointmentId",
        sql.UniqueIdentifier,
        appointment.id
      )
      .input(
        "status",
        sql.NVarChar,
        emailResult.status
      )
      .query(`
        INSERT INTO appointment_notifications
        (
          appointment_id,
          channel,
          status,
          sent_at
        )
        VALUES
        (
          @appointmentId,
          'email',
          @status,
          CASE
            WHEN @status = 'sent'
            THEN SYSUTCDATETIME()
            ELSE NULL
          END
        )
      `);
  } catch (error) {
    console.error(
      "Notification record error:",
      error.message
    );
  }

  return {
    success: true,
    patient,
    appointment,
    emailResult,
    shift,
  };
}

// ============================================================
// GENERAL HEALTH ASSISTANT
//
// This handles normal health questions and symptoms.
// It is intentionally separate from appointment booking.
//
// IMPORTANT:
// A pending appointment booking must NOT force every
// following message into the booking flow.
// ============================================================

async function generateHealthResponse(
  session,
  message,
  language
) {
  const recentHistory = session.history
    .slice(-10)
    .map(
      (item) =>
        `${item.role}: ${item.content}`
    )
    .join("\n");

  let languageInstruction =
    "Respond in clear English.";

  if (language === "roman_urdu") {
    languageInstruction =
      "Respond in natural, easy-to-understand Roman Urdu.";
  }

  if (language === "urdu") {
    languageInstruction =
      "Respond in clear Urdu script.";
  }

  const systemPrompt = `
You are the Hospital AI Health Assistant.

You provide general health information and guidance.
You are NOT a doctor and you must NOT diagnose or prescribe treatment.

${languageInstruction}

IMPORTANT MEDICAL SAFETY RULES:

1. NEVER prescribe or recommend any medicine.

2. NEVER give:
- Medicine names as treatment recommendations
- Dosages
- Number of tablets
- Frequency of medication
- Duration of medication
- Antibiotics
- Prescription medicines
- Medication treatment plans
- Instructions to start, stop, or change medication

3. If the user asks which medicine they should take,
do NOT provide a medicine name.

Instead, politely explain that you cannot prescribe
or recommend medication and advise the user to consult
a qualified doctor or pharmacist.

4. You MAY provide general information about:
- Common symptoms
- Common diseases and conditions
- Possible general causes
- Basic non-medication self-care
- Warning signs
- When to see a doctor

5. Do not make a definite diagnosis.
Use phrases such as:
"can be associated with"
"may be caused by"
"could be related to"

6. If the symptoms suggest a possible emergency,
tell the user to seek urgent medical attention.

7. If appropriate, recommend the relevant hospital
doctor or department.

8. Answer the user's CURRENT message.

9. Do not automatically continue an appointment booking
just because an appointment conversation happened earlier.

10. Keep responses short, clear, safe, and conversational.

IMPORTANT:
Hospital-specific questions such as doctors, departments,
doctor availability, doctor timings, and appointments are
handled by the hospital system separately.
Do not invent hospital-specific information.

Previous conversation:
${recentHistory || "(none)"}

Current user message:
${message}
`;

  try {
    const completion =
      await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: message,
          },
        ],
      });

    return (
      completion.choices?.[0]?.message
        ?.content
        ?.trim() ||
      (
        language === "roman_urdu"
          ? "Aap apni symptoms thori detail mein batayein. Main general health guidance dene ki koshish karta hoon."
          : language === "urdu"
          ? "براہِ کرم اپنی علامات کی تھوڑی مزید تفصیل بتائیں۔ میں عمومی صحت سے متعلق رہنمائی فراہم کرنے کی کوشش کرتا ہوں۔"
          : "Please describe your symptoms in a little more detail so I can provide general health guidance."
      )
    );
  } catch (error) {
    console.error(
      "Health assistant error:",
      error.message
    );

    if (language === "roman_urdu") {
      return "Mujhe abhi response generate karne mein problem ho rahi hai. Please apni symptoms dobara batayein.";
    }

    if (language === "urdu") {
      return "مجھے ابھی جواب تیار کرنے میں مسئلہ ہو رہا ہے۔ براہِ کرم اپنی علامات دوبارہ بتائیں۔";
    }

    return "I'm having trouble generating a response right now. Please describe your symptoms again.";
  }
}

// ============================================================
// BOOKING CONTINUATION CHECK
//
// A pending booking does NOT mean every message is booking.
//
// Examples:
//
// "I want to book an appointment"
// -> booking
//
// "Cardiology"
// -> booking continuation
//
// "Monday"
// -> booking continuation
//
// "mujhey sar main dard ho raha hey"
// -> health question
//
// "what are the symptoms of flu"
// -> health question
// ============================================================

function isBookingContinuationMessage(
  message,
  extracted,
  session
) {
  // Explicit booking language always continues booking.
  if (isBookingIntent(message)) {
    return true;
  }

  // If doctor options are currently being displayed,
  // allow number/name selection.
  if (
    Array.isArray(session.doctorOptions) &&
    session.doctorOptions.length
  ) {
    const selected =
      selectDoctorFromOptions(
        message,
        session.doctorOptions
      );

    if (selected) {
      return true;
    }

    const text =
      normalizeText(message);

    if (
      /^\d{1,2}$/.test(text)
    ) {
      return true;
    }
  }

  // These fields indicate that the current message
  // contains actual appointment information.
  if (
    extracted?.doctor_name ||
    extracted?.department ||
    extracted?.preferred_date ||
    extracted?.preferred_time ||
    extracted?.full_name ||
    extracted?.age ||
    extracted?.phone ||
    extracted?.email ||
    extracted?.confirmation
  ) {
    return true;
  }

  return false;
}

// ============================================================
// MAIN AI ROUTE
// ============================================================

router.post(
  "/message",
  async (req, res) => {
    const {
      sessionToken,
      message,
    } = req.body;

    if (
      !sessionToken ||
      !message
    ) {
      return res.status(400).json({
        error:
          "sessionToken and message are required.",
      });
    }

    try {
      const session =
        getSession(
          sessionToken
        );

      const detectedLanguage = detectLanguage(message);

const language =
  detectedLanguage === "ur"
    ? "urdu"
    : detectedLanguage === "ur-roman"
    ? "roman_urdu"
    : "english";

      const pool =
  await getPool();

      // ======================================================
      // 1. EMERGENCY SAFETY PRE-CHECK
      // ======================================================
      const emergencyAlert = checkEmergency(message, language);
      if (emergencyAlert) {
        addHistory(session, "user", message);
        addHistory(session, "assistant", emergencyAlert);
        return res.json({
          reply: emergencyAlert,
          conversationId: sessionToken,
          language,
        });
      }

      // ======================================================
      // 2. PRESCRIPTION & DOSAGE DENIAL GUARDRAIL
      // ======================================================
      const dosageDenial = checkPrescriptionDosageDenial(message, language);
      if (dosageDenial) {
        addHistory(session, "user", message);
        addHistory(session, "assistant", dosageDenial);
        return res.json({
          reply: dosageDenial,
          conversationId: sessionToken,
          language,
        });
      }

      // ======================================================
      // 3. MEDICINE INTERACTION SAFETY CHECK
      // ======================================================
      if (isInteractionQuery(message)) {
        const interactionReply = await handleMedicineInteraction(message, language);
        addHistory(session, "user", message);
        addHistory(session, "assistant", interactionReply);
        return res.json({
          reply: interactionReply,
          conversationId: sessionToken,
          language,
        });
      }

      // ======================================================
      // 4. PHARMACY ACTIONS & ORDER FLOW
      // ======================================================
      const pharmacyReply = await handlePharmacyFlow(pool, session, message, language);
      if (pharmacyReply) {
        addHistory(session, "user", message);
        addHistory(session, "assistant", pharmacyReply);
        return res.json({
          reply: pharmacyReply,
          conversationId: sessionToken,
          language,
        });
      }

      // ======================================================
      // 5. LABORATORY ACTIONS & BOOKING FLOW
      // ======================================================
      const labReply = await handleLabFlow(pool, session, message, language);
      if (labReply) {
        addHistory(session, "user", message);
        addHistory(session, "assistant", labReply);
        return res.json({
          reply: labReply,
          conversationId: sessionToken,
          language,
        });
      }

// ======================================================
// DEPARTMENT LIST
//
// This must run BEFORE booking extraction so that
// questions such as:
//
// "which departments are available"
// "what departments do you have"
// "kon se departments available hain"
//
// are answered even when the user is already
// inside an appointment booking conversation.
//
// IMPORTANT:
// We do NOT clear session.booking here.
// The user can choose a department immediately
// after seeing the list.
// ======================================================

if (
  isDepartmentListQuestion(message)
) {
  const departments =
    await getAvailableDepartments(
      pool
    );

  const reply =
    formatDepartments(
      departments,
      language
    );

  addHistory(
    session,
    "user",
    message
  );

  addHistory(
    session,
    "assistant",
    reply
  );

  return res.json({
    reply,
    conversationId:
      sessionToken,
    language,
  });
}

// ======================================================
// EXTRACT USER INFORMATION
// ======================================================

const extracted =
  await extractBookingDetails(
    session.history,
    message
  );

      // ======================================================
// DOCTOR LIST
//
// If the user asks for doctors and mentions a department,
// show ONLY doctors from that department.
//
// Examples:
//
// "which doctors are available"
// -> all active doctors
//
// "list doctors available in cardiology"
// -> ONLY Cardiology doctors
//
// "show doctors in neurology"
// -> ONLY Neurology doctors
//
// "ok and list me the doctors available in cardiology"
// -> ONLY Cardiology doctors
// ======================================================

if (
  isDoctorListQuestion(
    message
  ) &&
  !isBookingIntent(message)
) {
  const mentionedDepartment =
    await findDepartment(
      pool,
      message
    );

  let doctors;

  if (mentionedDepartment) {
    doctors =
      await getDoctorsForDepartment(
        pool,
        mentionedDepartment.name
      );
  } else {
    doctors =
      await getAllActiveDoctors(
        pool
      );
  }

  const reply =
    formatDoctors(
      doctors,
      language
    );

  addHistory(
    session,
    "user",
    message
  );

  addHistory(
    session,
    "assistant",
    reply
  );

  return res.json({
    reply,
    conversationId:
      sessionToken,
    language,
  });
}

// ======================================================
// DOCTOR SUGGESTION FLOW
//
// Example:
// "doctor suggest karo"
// -> ask for symptoms
//
// Then:
// "mujhe sar mein dard aur chakkar hain"
// -> suggest an existing hospital doctor
// ======================================================

if (
  isDoctorSuggestionRequest(message) &&
  !session.doctorSuggestionPending
) {
  session.doctorSuggestionPending = true;

  let reply;

  if (language === "urdu") {
    reply =
      "ضرور۔ مناسب doctor تجویز کرنے کے لیے براہِ کرم اپنی symptoms بتائیں۔ مثال کے طور پر درد کہاں ہے، کب سے ہے اور کوئی دوسری اہم علامت بھی ہے؟";
  } else if (
    language === "roman_urdu"
  ) {
    reply =
      "Zaroor. Suitable doctor suggest karne ke liye please apni symptoms batayein. Misal ke taur par dard kahan hai, kab se hai aur koi doosri important symptom bhi hai?";
  } else {
    reply =
      "Sure. To suggest the appropriate doctor, please describe your symptoms. For example, where the problem is, how long you have had it, and any other important symptoms.";
  }

  addHistory(
    session,
    "user",
    message
  );

  addHistory(
    session,
    "assistant",
    reply
  );

  return res.json({
    reply,
    conversationId: sessionToken,
    language,
  });
}

// ======================================================
// ANSWER PENDING DOCTOR SUGGESTION
//
// The user's current message is treated as symptom
// information, not as an appointment booking request.
// ======================================================

if (
  session.doctorSuggestionPending
) {
  session.doctorSuggestionPending = false;

  const reply =
  await suggestDoctorForSymptoms(
    pool,
    message,
    language,
    session
  );

  addHistory(
    session,
    "user",
    message
  );

  addHistory(
    session,
    "assistant",
    reply
  );

  return res.json({
    reply,
    conversationId: sessionToken,
    language,
  });
}

      // ======================================================
      // DETERMINE BOOKING INTENT
      // ======================================================

      const bookingIntent =
  isBookingContinuationMessage(
    message,
    extracted,
    session
  );

  // ======================================================
// NORMAL HEALTH QUESTION
//
// If the current message is not an appointment-related
// message, answer it as a normal health question.
//
// IMPORTANT:
// We keep session.booking intact so the user can return
// to the appointment later.
// ======================================================

if (!bookingIntent) {
  const reply =
    await generateHealthResponse(
      session,
      message,
      language
    );

  addHistory(
    session,
    "user",
    message
  );

  addHistory(
    session,
    "assistant",
    reply
  );

  return res.json({
    reply,
    conversationId:
      sessionToken,
    language,
  });
}

      // ======================================================
      // NEW GENERIC BOOKING
      // ======================================================

      if (
        isBookingIntent(message) &&
        !session.booking &&
        !extracted.doctor_name &&
        !extracted.department &&
        !extracted.preferred_date &&
        !extracted.preferred_time
      ) {
        session.booking = {};
        session.doctorOptions = [];

        const reply =
          askDepartmentOrDoctor(
            language
          );

        addHistory(
          session,
          "user",
          message
        );

        addHistory(
          session,
          "assistant",
          reply
        );

        return res.json({
          reply,
          conversationId:
            sessionToken,
          language,
        });
      }

      // ======================================================
      // INITIALIZE BOOKING
      // ======================================================

      if (
        bookingIntent &&
        !session.booking
      ) {
        session.booking = {};
      }

      // ======================================================
// MERGE EXTRACTED DATA
// ======================================================

const previousDepartment =
  session.booking?.department || null;

session.booking =
  mergeBooking(
    session.booking,
    extracted
  );

const booking =
  session.booking;

// ======================================================
// DEPARTMENT CHANGE
//
// If the user changes department while booking,
// discard the previously selected doctor and doctor list.
//
// Example:
// Neurology
// -> select doctor
// -> "and in orthopedics?"
//
// The assistant must now show Orthopedics doctors,
// not continue with Neurology.
// ======================================================

if (
  extracted?.department &&
  previousDepartment &&
  normalizeDepartmentInput(
    extracted.department
  ) !==
    normalizeDepartmentInput(
      previousDepartment
    )
) {
  booking.doctor_id = null;
  booking.doctor_name = null;

  session.doctorOptions = [];
}
      // ======================================================
      // FIND DEPARTMENT
      // ======================================================

      if (!booking.department) {
        const possibleDepartment =
          await findDepartment(
            pool,
            message
          );

        if (
          possibleDepartment
        ) {
          booking.department =
            possibleDepartment.name;
        }
      }

      // ======================================================
      // FIND DOCTOR DIRECTLY FROM MESSAGE
      // ======================================================

      if (!booking.doctor_id) {
        const mentionedDoctors =
          await findDoctorsMentionedInMessage(
            pool,
            message,
            booking.department ||
              null
          );

        if (
          mentionedDoctors.length ===
          1
        ) {
          const doctor =
            mentionedDoctors[0];

          booking.doctor_id =
            doctor.id;

          booking.doctor_name =
            doctor.full_name;

          booking.department =
            doctor.department_name;
        } else if (
          mentionedDoctors.length >
          1
        ) {
          session.doctorOptions =
            mentionedDoctors;

          const reply =
            formatDuplicateDoctors(
              mentionedDoctors,
              language
            );

          addHistory(
            session,
            "user",
            message
          );

          addHistory(
            session,
            "assistant",
            reply
          );

          return res.json({
            reply,
            conversationId:
              sessionToken,
            language,
          });
        }
      }

      // ======================================================
      // EXISTING DOCTOR OPTIONS
      // ======================================================

      if (
        session.doctorOptions.length
      ) {
        const selected =
          selectDoctorFromOptions(
            message,
            session.doctorOptions
          );

        if (!selected) {
          const reply =
            formatDuplicateDoctors(
              session.doctorOptions,
              language
            );

          addHistory(
            session,
            "user",
            message
          );

          addHistory(
            session,
            "assistant",
            reply
          );

          return res.json({
            reply,
            conversationId:
              sessionToken,
            language,
          });
        }

        booking.doctor_id =
          selected.id;

        booking.doctor_name =
          selected.full_name;

        booking.department =
          selected.department_name;

        session.doctorOptions =
          [];
      }

      // ======================================================
      // SEARCH BY EXTRACTED DOCTOR NAME
      // ======================================================

      if (
        !booking.doctor_id &&
        booking.doctor_name
      ) {
        const candidates =
          await findDoctorCandidates(
            pool,
            booking.doctor_name,
            booking.department ||
              null
          );

        if (
          candidates.length ===
          1
        ) {
          const doctor =
            candidates[0];

          booking.doctor_id =
            doctor.id;

          booking.doctor_name =
            doctor.full_name;

          booking.department =
            doctor.department_name;
        } else if (
          candidates.length >
          1
        ) {
          session.doctorOptions =
            candidates;

          const reply =
            formatDuplicateDoctors(
              candidates,
              language
            );

          addHistory(
            session,
            "user",
            message
          );

          addHistory(
            session,
            "assistant",
            reply
          );

          return res.json({
            reply,
            conversationId:
              sessionToken,
            language,
          });
        }
      }

      // ======================================================
      // DEPARTMENT ONLY
      // ======================================================

      if (
        booking.department &&
        !booking.doctor_id
      ) {
        const doctors =
          await getDoctorsForDepartment(
            pool,
            booking.department
          );

        if (!doctors.length) {
          const reply =
            language === "urdu"
              ? "مجھے اس department میں کوئی active doctor نہیں ملا۔ براہِ کرم دوسرا department منتخب کریں۔"
              : language ===
                "roman_urdu"
              ? "Mujhe is department mein koi active doctor nahi mila. Please doosra department select karein."
              : "I couldn't find an active doctor in that department. Please choose another department.";

          addHistory(
            session,
            "user",
            message
          );

          addHistory(
            session,
            "assistant",
            reply
          );

          return res.json({
            reply,
            conversationId:
              sessionToken,
            language,
          });
        }

        session.doctorOptions =
          doctors;

        const reply =
          formatDoctors(
            doctors,
            language
          );

        addHistory(
          session,
          "user",
          message
        );

        addHistory(
          session,
          "assistant",
          reply
        );

        return res.json({
          reply,
          conversationId:
            sessionToken,
          language,
        });
      }

      // ======================================================
      // NO DOCTOR YET
      // ======================================================

      if (!booking.doctor_id) {
        const reply =
          askDepartmentOrDoctor(
            language
          );

        addHistory(
          session,
          "user",
          message
        );

        addHistory(
          session,
          "assistant",
          reply
        );

        return res.json({
          reply,
          conversationId:
            sessionToken,
          language,
        });
      }

      // ======================================================
      // LOAD EXACT DOCTOR FROM SQL SERVER
      // ======================================================

      const doctorResult =
        await pool
          .request()
          .input(
            "doctorId",
            sql.UniqueIdentifier,
            booking.doctor_id
          )
          .query(`
            SELECT
              d.id,
              d.full_name,
              d.specialization,
              d.availability,
              d.status,
              d.department_id,
              dep.name AS department_name
            FROM doctors d
            INNER JOIN departments dep
              ON dep.id = d.department_id
            WHERE d.id = @doctorId
              AND d.status = 'active'
          `);

      const doctor =
        doctorResult.recordset[0];

      if (!doctor) {
        session.booking = {};
        session.doctorOptions = [];

        const reply =
          askDepartmentOrDoctor(
            language
          );

        addHistory(
          session,
          "user",
          message
        );

        addHistory(
          session,
          "assistant",
          reply
        );

        return res.json({
          reply,
          conversationId:
            sessionToken,
          language,
        });
      }

      booking.doctor_id =
        doctor.id;

      booking.doctor_name =
        doctor.full_name;

      // Department from SQL is authoritative.
      booking.department =
        doctor.department_name;

      // ======================================================
      // DATE AVAILABILITY QUESTION
      // ======================================================

      if (
        isDateAvailabilityQuestion(
          message
        ) &&
        !parseNaturalDate(message)
      ) {
        const dates =
          await getUpcomingAvailableDates(
            pool,
            doctor,
            30
          );

        const reply =
          dates.length
            ? formatAvailabilityMessage(
                doctor,
                dates,
                language
              )
            : language === "urdu"
            ? `${doctor.full_name} کے لیے اس وقت کوئی available date نہیں ملی۔`
            : language ===
              "roman_urdu"
            ? `${doctor.full_name} ke liye is waqt koi available date nahi mili.`
            : `I couldn't find an available date for ${doctor.full_name} right now.`;

        addHistory(
          session,
          "user",
          message
        );

        addHistory(
          session,
          "assistant",
          reply
        );

        return res.json({
          reply,
          conversationId:
            sessionToken,
          language,
        });
      }

      // ======================================================
      // DATE FROM USER MESSAGE
      // ======================================================

      const explicitDate =
        parseNaturalDate(message);

      if (explicitDate) {
        booking.preferred_date =
          explicitDate;
      }

      // ======================================================
      // TIME FROM USER MESSAGE
      // ======================================================

      const explicitTime =
        parseNaturalTime(message);

      if (explicitTime) {
        booking.preferred_time =
          explicitTime;
      }

      // ======================================================
      // DATE REQUIRED
      //
      // IMPORTANT:
      // TIME IS NOT REQUIRED.
      // ======================================================

      if (
        !booking.preferred_date
      ) {
        const dates =
          await getUpcomingAvailableDates(
            pool,
            doctor,
            30
          );

        const reply =
          dates.length
            ? formatAvailabilityMessage(
                doctor,
                dates,
                language
              )
            : language === "urdu"
            ? `${doctor.full_name} کے لیے کوئی available date نہیں ملی۔`
            : language ===
              "roman_urdu"
            ? `${doctor.full_name} ke liye koi available date nahi mili.`
            : `I couldn't find an available date for ${doctor.full_name}.`;

        addHistory(
          session,
          "user",
          message
        );

        addHistory(
          session,
          "assistant",
          reply
        );

        return res.json({
          reply,
          conversationId:
            sessionToken,
          language,
        });
      }

      // ======================================================
// GENERAL DOCTOR TIMING QUESTION
//
// If the user asks for a doctor's timing but has NOT
// selected a specific date, show the doctor's weekly
// working shifts.
//
// Examples:
//
// "what is Dr Adeel Raza timing"
// "tell me the timing of Dr Adeel Raza"
// "what are Dr Adeel Raza timings"
// "Dr Adeel Raza kab available hotay hain"
//
// The user does not need to provide a date for this.
// ======================================================

if (
  isTimeAvailabilityQuestion(
    message
  ) &&
  !booking.preferred_date
) {
  const dates =
    await getUpcomingAvailableDates(
      pool,
      doctor,
      30
    );

  const reply =
    dates.length
      ? formatAvailabilityMessage(
          doctor,
          dates,
          language
        )
      : language === "urdu"
      ? `${doctor.full_name} کے لیے اس وقت کوئی working shift available نہیں ہے۔`
      : language === "roman_urdu"
      ? `${doctor.full_name} ke liye is waqt koi working shift available nahi hai.`
      : `There are currently no working shifts available for ${doctor.full_name}.`;

  addHistory(
    session,
    "user",
    message
  );

  addHistory(
    session,
    "assistant",
    reply
  );

  return res.json({
    reply,
    conversationId:
      sessionToken,
    language,
  });
}

      // ======================================================
      // VALIDATE DATE
      // ======================================================

      if (
        !isValidDateString(
          booking.preferred_date
        )
      ) {
        booking.preferred_date =
          null;

        const reply =
          language === "urdu"
            ? "براہِ کرم درست date بتائیں، مثال کے طور پر Monday یا September 9۔"
            : language ===
              "roman_urdu"
            ? "Please valid date batayein, misal ke taur par Monday ya September 9."
            : "Please provide a valid date, for example Monday or September 9.";

        addHistory(
          session,
          "user",
          message
        );

        addHistory(
          session,
          "assistant",
          reply
        );

        return res.json({
          reply,
          conversationId:
            sessionToken,
          language,
        });
      }

      // ======================================================
      // GET THE DOCTOR'S SHIFT
      // ======================================================

      const shift =
        getShiftForDate(
          doctor,
          booking.preferred_date
        );

      // ======================================================
      // DATE NOT WORKING
      // ======================================================

      if (!shift) {
        const dates =
          await getUpcomingAvailableDates(
            pool,
            doctor,
            30
          );

        const reply =
          formatUnavailableDateMessage(
            doctor,
            booking.preferred_date,
            dates,
            language
          );

        booking.preferred_date =
          null;

        booking.preferred_time =
          null;

        addHistory(
          session,
          "user",
          message
        );

        addHistory(
          session,
          "assistant",
          reply
        );

        return res.json({
          reply,
          conversationId:
            sessionToken,
          language,
        });
      }

      // ======================================================
      // TIME WAS PROVIDED
      //
      // TIME IDENTIFIES THE SHIFT ONLY.
      // ======================================================

      if (
        booking.preferred_time
      ) {
        const requestedTime =
          normalizeTime(
            booking.preferred_time
          );

        if (!requestedTime) {
          booking.preferred_time =
            null;

          const reply =
            language === "urdu"
              ? `براہِ کرم درست وقت بتائیں۔ ${shift.label} doctor کی working shift ہے۔`
              : language ===
                "roman_urdu"
              ? `Please valid time batayein. ${shift.label} doctor ki working shift hai.`
              : `Please provide a valid time. The doctor's working shift is ${shift.label}.`;

          addHistory(
            session,
            "user",
            message
          );

          addHistory(
            session,
            "assistant",
            reply
          );

          return res.json({
            reply,
            conversationId:
              sessionToken,
            language,
          });
        }

        if (
          !isTimeWithinShift(
            requestedTime,
            shift
          )
        ) {
          const reply =
            language === "urdu"
              ? `${formatTimeForDisplay(
                  requestedTime
                )} اس doctor کی working shift سے باہر ہے۔ ${doctor.full_name} کی اس date پر shift ${shift.label} ہے۔`
              : language ===
                "roman_urdu"
              ? `${formatTimeForDisplay(
                  requestedTime
                )} is doctor ki working shift se bahar hai. ${doctor.full_name} ki is date par shift ${shift.label} hai.`
              : `${formatTimeForDisplay(
                  requestedTime
                )} is outside the doctor's working shift. Dr. ${doctor.full_name}'s shift on this date is ${shift.label}.`;

          booking.preferred_time =
            null;

          addHistory(
            session,
            "user",
            message
          );

          addHistory(
            session,
            "assistant",
            reply
          );

          return res.json({
            reply,
            conversationId:
              sessionToken,
            language,
          });
        }
      }

      // ======================================================
      // TIME AVAILABILITY QUESTION
      //
      // Return ONE SHIFT, not a list of 30-minute slots.
      // ======================================================

      if (
        isTimeAvailabilityQuestion(
          message
        ) &&
        !explicitTime
      ) {
        const reply =
          formatAvailableShiftMessage(
            doctor,
            booking.preferred_date,
            shift,
            language
          );

        addHistory(
          session,
          "user",
          message
        );

        addHistory(
          session,
          "assistant",
          reply
        );

        return res.json({
          reply,
          conversationId:
            sessionToken,
          language,
        });
      }

      // ======================================================
      // PATIENT INFORMATION
      //
      // TIME IS NOT REQUESTED.
      // ======================================================

      if (
        !booking.full_name ||
        booking.age === null ||
        booking.age === undefined ||
        booking.age === "" ||
        !booking.phone ||
        !booking.email
      ) {
        const reply =
          askPatientInformation(
            language
          );

        addHistory(
          session,
          "user",
          message
        );

        addHistory(
          session,
          "assistant",
          reply
        );

        return res.json({
          reply,
          conversationId:
            sessionToken,
          language,
        });
      }

      // ======================================================
      // AGE VALIDATION
      // ======================================================

      booking.age =
        Number(booking.age);

      if (
        !Number.isInteger(
          booking.age
        ) ||
        booking.age < 1 ||
        booking.age > 120
      ) {
        const reply =
          language === "urdu"
            ? "براہِ کرم 1 سے 120 کے درمیان درست عمر بتائیں۔"
            : language ===
              "roman_urdu"
            ? "Please 1 se 120 ke darmiyan valid age batayein."
            : "Please provide a valid age between 1 and 120.";

        addHistory(
          session,
          "user",
          message
        );

        addHistory(
          session,
          "assistant",
          reply
        );

        return res.json({
          reply,
          conversationId:
            sessionToken,
          language,
        });
      }

      // ======================================================
      // EMAIL VALIDATION
      // ======================================================

      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailPattern.test(
          String(
            booking.email
          ).trim()
        )
      ) {
        const reply =
          language === "urdu"
            ? "براہِ کرم درست email address فراہم کریں۔"
            : language ===
              "roman_urdu"
            ? "Please valid email address provide karein."
            : "Please provide a valid email address.";

        addHistory(
          session,
          "user",
          message
        );

        addHistory(
          session,
          "assistant",
          reply
        );

        return res.json({
          reply,
          conversationId:
            sessionToken,
          language,
        });
      }

      // ======================================================
      // REASON
      // ======================================================

      if (!booking.reason) {
        if (
          doesNotWantReason(
            message
          )
        ) {
          booking.reason =
            "Not provided";
        } else {
          const reply =
            askReason(
              language
            );

          addHistory(
            session,
            "user",
            message
          );

          addHistory(
            session,
            "assistant",
            reply
          );

          return res.json({
            reply,
            conversationId:
              sessionToken,
            language,
          });
        }
      }

      // ======================================================
      // CONFIRMATION
      // ======================================================

      const confirmed =
        extracted.confirmation ||
        isConfirmationMessage(
          message
        );

      if (!confirmed) {
        const dateText =
          formatDisplayDate(
            booking.preferred_date
          );

        const shiftText =
          shift.label;

        const reason =
          booking.reason ||
          "Not provided";

        let reply;

        if (language === "urdu") {
          reply = `Appointment کی details:

نام: ${booking.full_name}
عمر: ${booking.age}
فون: ${booking.phone}
ای میل: ${booking.email}
Department: ${doctor.department_name}
Doctor: ${doctor.full_name}
تاریخ: ${dateText}
Doctor's Shift: ${shiftText}
وجہ: ${reason}

یہ appointment doctor کے پورے working shift کے لیے ہے، exact consultation time منتخب کرنے کی ضرورت نہیں ہے۔

کیا تمام details درست ہیں اور کیا میں appointment book کر دوں؟`;
        } else if (
          language ===
          "roman_urdu"
        ) {
          reply = `Appointment ki details:

Naam: ${booking.full_name}
Age: ${booking.age}
Phone: ${booking.phone}
Email: ${booking.email}
Department: ${doctor.department_name}
Doctor: ${doctor.full_name}
Date: ${dateText}
Doctor's Shift: ${shiftText}
Reason: ${reason}

Yeh appointment doctor ke poore working shift ke liye hai. Exact consultation time select karne ki zaroorat nahi hai.

Kya tamam details correct hain aur main appointment book kar doon?`;
        } else {
          reply = `Here are your appointment details:

Name: ${booking.full_name}
Age: ${booking.age}
Phone: ${booking.phone}
Email: ${booking.email}
Department: ${doctor.department_name}
Doctor: ${doctor.full_name}
Date: ${dateText}
Doctor's Shift: ${shiftText}
Reason: ${reason}

This appointment is for the doctor's full working shift. You do not need to select an exact consultation time.

Are all these details correct, and would you like me to book the appointment?`;
        }

        addHistory(
          session,
          "user",
          message
        );

        addHistory(
          session,
          "assistant",
          reply
        );

        return res.json({
          reply,
          conversationId:
            sessionToken,
          language,
        });
      }

      // ======================================================
      // FINAL LIVE SHIFT CHECK
      //
      // NO DATABASE APPOINTMENT CONFLICT CHECK.
      // ======================================================

      const finalShift =
        getShiftForDate(
          doctor,
          booking.preferred_date
        );

      if (!finalShift) {
        const dates =
          await getUpcomingAvailableDates(
            pool,
            doctor,
            30
          );

        const reply =
          formatUnavailableDateMessage(
            doctor,
            booking.preferred_date,
            dates,
            language
          );

        booking.preferred_date =
          null;

        booking.preferred_time =
          null;

        addHistory(
          session,
          "user",
          message
        );

        addHistory(
          session,
          "assistant",
          reply
        );

        return res.json({
          reply,
          conversationId:
            sessionToken,
          language,
        });
      }

      if (
        booking.preferred_time &&
        !isTimeWithinShift(
          booking.preferred_time,
          finalShift
        )
      ) {
        const reply =
          language === "urdu"
            ? `Requested time doctor کی shift سے باہر ہے۔ Available shift: ${finalShift.label}`
            : language ===
              "roman_urdu"
            ? `Requested time doctor ki shift se bahar hai. Available shift: ${finalShift.label}`
            : `The requested time is outside the doctor's working shift. Available shift: ${finalShift.label}`;

        booking.preferred_time =
          null;

        addHistory(
          session,
          "user",
          message
        );

        addHistory(
          session,
          "assistant",
          reply
        );

        return res.json({
          reply,
          conversationId:
            sessionToken,
          language,
        });
      }

      // ======================================================
      // CREATE BOOKING
      // ======================================================

      const result =
        await createAppointment(
          pool,
          booking,
          doctor
        );

      if (!result.success) {
        let reply;

        if (
          result.error ===
          "outside_shift"
        ) {
          reply =
            language === "urdu"
              ? `Requested time doctor کی working shift سے باہر ہے۔ Shift: ${result.shift?.label || "unavailable"}`
              : language ===
                "roman_urdu"
              ? `Requested time doctor ki working shift se bahar hai. Shift: ${result.shift?.label || "unavailable"}`
              : `The requested time is outside the doctor's working shift. Shift: ${result.shift?.label || "unavailable"}`;
        } else {
          reply =
            language === "urdu"
              ? "Appointment book نہیں ہو سکی۔ براہِ کرم دوبارہ کوشش کریں۔"
              : language ===
                "roman_urdu"
              ? "Appointment book nahi ho saki. Please dobara try karein."
              : "The appointment could not be booked. Please try again.";
        }

        addHistory(
          session,
          "user",
          message
        );

        addHistory(
          session,
          "assistant",
          reply
        );

        return res.json({
          reply,
          conversationId:
            sessionToken,
          language,
        });
      }

      // ======================================================
      // SUCCESS
      // ======================================================

      const dateText =
        formatDisplayDate(
          booking.preferred_date
        );

      const shiftText =
        result.shift.label;

      let reply;

      if (language === "urdu") {
        reply = `آپ کی appointment کامیابی سے book ہو گئی ہے۔ ✅

Appointment ID: ${result.appointment.appointment_code}
Doctor: ${doctor.full_name}
Department: ${doctor.department_name}
تاریخ: ${dateText}
Doctor's Shift: ${shiftText}

Confirmation email آپ کے email address پر بھیج دی گئی ہے۔`;
      } else if (
        language ===
        "roman_urdu"
      ) {
        reply = `Aap ki appointment successfully book ho gayi hai. ✅

Appointment ID: ${result.appointment.appointment_code}
Doctor: ${doctor.full_name}
Department: ${doctor.department_name}
Date: ${dateText}
Doctor's Shift: ${shiftText}

Confirmation email aap ke email address par bhej di gayi hai.`;
      } else {
        reply = `Your appointment has been successfully booked. ✅

Appointment ID: ${result.appointment.appointment_code}
Doctor: ${doctor.full_name}
Department: ${doctor.department_name}
Date: ${dateText}
Doctor's Shift: ${shiftText}

A confirmation email has been sent to the email address you provided.`;
      }

      addHistory(
        session,
        "user",
        message
      );

      addHistory(
        session,
        "assistant",
        reply
      );

      // Clear booking after successful booking.
      session.booking = null;
      session.doctorOptions = [];

      return res.json({
        reply,
        conversationId:
          sessionToken,
        language,

        appointment: {
          id:
            result.appointment.id,

          appointment_code:
            result.appointment
              .appointment_code,

          doctor:
            doctor.full_name,

          department:
            doctor.department_name,

          date:
            booking.preferred_date,

          shift_start:
            result.shift.start_time,

          shift_end:
            result.shift.end_time,

          shift_label:
            result.shift.label,
        },
      });
    } catch (error) {
      console.error(
        "Assistant route error:",
        error
      );

      return res.status(500).json({
        error:
          "The assistant is unavailable right now.",
      });
    }
  }
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;