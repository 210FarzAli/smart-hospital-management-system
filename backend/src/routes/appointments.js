const express = require("express");
const { sql, getPool } = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { sendAppointmentEmail } = require("../utils/notify");

const router = express.Router();

/* =========================================================
   HELPERS
========================================================= */

function shortCode(prefix) {
  return `${prefix}-${Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase()}`;
}

function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00`);

  return !Number.isNaN(parsed.getTime());
}

function getDayName(date) {
  if (!date) {
    return null;
  }

  let parsed;

  // SQL Server DATE values can arrive as JavaScript Date objects.
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    parsed = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
  } else {
    const text = String(date).trim();

    // Handle YYYY-MM-DD directly.
    const match = text.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (match) {
      parsed = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      );
    } else {
      parsed = new Date(text);
    }
  }

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const days = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ];

  return days[parsed.getDay()] || null;
}

function normalizeTime(value) {
  if (!value) return null;

  const text = String(value).trim();

  const match = text.match(/^(\d{1,2}):(\d{2})/);

  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

function timeToMinutes(value) {
  const normalized = normalizeTime(value);

  if (!normalized) return null;

  const [hours, minutes] = normalized.split(":").map(Number);

  return hours * 60 + minutes;
}

function timeFallsWithinShift(time, shiftStart, shiftEnd) {
  const requestedMinutes = timeToMinutes(time);
  const startMinutes = timeToMinutes(shiftStart);
  const endMinutes = timeToMinutes(shiftEnd);

  if (
    requestedMinutes === null ||
    startMinutes === null ||
    endMinutes === null
  ) {
    return false;
  }

  /*
    Normal daytime shift:
    09:00 - 17:00

    Valid:
    09:00
    12:00
    16:30

    Invalid:
    08:00
    17:30
    20:00

    The end time itself is treated as outside the working
    period because the shift ends at that time.
  */
  return (
    requestedMinutes >= startMinutes &&
    requestedMinutes < endMinutes
  );
}

function parseDoctorSchedule(availability) {
  let schedule = [];

  try {
    schedule = JSON.parse(availability || "[]");

    if (!Array.isArray(schedule)) {
      schedule = [];
    }
  } catch {
    schedule = [];
  }

  return schedule;
}

function getDoctorShiftForDate(availability, date) {
  const requestedDay = getDayName(date);

  const schedule = parseDoctorSchedule(availability);

  const daySchedule = requestedDay
  ? schedule.find(
      (item) =>
        String(item.day || "").toLowerCase() ===
        requestedDay.toLowerCase()
    )
  : null;
  if (!daySchedule) {
    return null;
  }

  const startTime = normalizeTime(daySchedule.start_time);
  const endTime = normalizeTime(daySchedule.end_time);

  if (!startTime || !endTime) {
    return null;
  }

  return {
    day: requestedDay,
    start_time: startTime,
    end_time: endTime,
    label: `${startTime} - ${endTime}`,
  };
}

/*
  Adds shift information to appointment records returned by
  admin/doctor/detail endpoints.

  The database still stores appointment_time as the shift start
  for compatibility.
*/
function addShiftToAppointment(appointment) {
  if (!appointment) return appointment;

  const shift = getDoctorShiftForDate(
    appointment.doctor_availability,
    appointment.appointment_date
  );

  if (!shift) {
    return {
      ...appointment,
      shift_start: appointment.appointment_time || null,
      shift_end: null,
      shift_label: appointment.appointment_time
        ? `${appointment.appointment_time}`
        : null,
    };
  }

  return {
    ...appointment,
    shift_start: shift.start_time,
    shift_end: shift.end_time,
    shift_label: shift.label,
  };
}

/* =========================================================
   GET /api/appointments/availability

   APPOINTMENT MODEL:

   One doctor's working period = ONE BOOKABLE SHIFT.

   Example:

   Monday 09:00 - 17:00

   This is one bookable shift.

   Multiple patients can book the same shift.

   Existing appointments NEVER make the shift unavailable.
========================================================= */

router.get("/availability", async (req, res) => {
  const { doctorId, date } = req.query;

  if (!doctorId || !date) {
    return res.status(400).json({
      error: "doctorId and date are required.",
    });
  }

  if (!isValidDate(date)) {
    return res.status(400).json({
      error: "Invalid date. Use YYYY-MM-DD.",
    });
  }

  try {
    const pool = await getPool();

    const doctorResult = await pool
      .request()
      .input("doctorId", sql.UniqueIdentifier, doctorId)
      .query(`
        SELECT
          id,
          full_name,
          specialization,
          availability,
          status
        FROM doctors
        WHERE id = @doctorId
      `);

    const doctor = doctorResult.recordset[0];

    if (!doctor) {
      return res.status(404).json({
        error: "Doctor not found.",
      });
    }

    if (doctor.status !== "active") {
      return res.status(400).json({
        error: "Doctor is not active.",
      });
    }

    const requestedDay = getDayName(date);

    const shift = getDoctorShiftForDate(
      doctor.availability,
      date
    );

    if (!shift) {
      return res.json({
        doctor: {
          id: doctor.id,
          full_name: doctor.full_name,
          specialization: doctor.specialization,
        },
        date,
        day: requestedDay,
        available: false,
        shift: null,
        available_slots: [],
      });
    }

    return res.json({
      doctor: {
        id: doctor.id,
        full_name: doctor.full_name,
        specialization: doctor.specialization,
      },

      date,
      day: requestedDay,
      available: true,

      schedule: {
        start_time: shift.start_time,
        end_time: shift.end_time,
      },

      shift,

      /*
        Kept for compatibility with older frontend code.
        This array contains ONE SHIFT, not multiple exact
        consultation times.
      */
      available_slots: [shift],
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Failed to load doctor availability.",
    });
  }
});

/* =========================================================
   POST /api/appointments

   PUBLIC APPOINTMENT BOOKING

   The patient books:

   Doctor
   Date
   Doctor's working shift

   NOT an exact consultation time.

   appointment_time is retained only for database
   compatibility and stores the shift START.

   Example:

   Shift:
   09:00 - 17:00

   Database appointment_time:
   09:00

   This DOES NOT mean the patient has a 09:00
   exact consultation.
========================================================= */

router.post("/", async (req, res) => {
  const {
    full_name,
    age,
    phone,
    email,
    doctor_id,
    appointment_date,
    appointment_time,
    reason,
  } = req.body;

  if (
    !full_name ||
    age === undefined ||
    age === null ||
    !phone ||
    !email ||
    !doctor_id ||
    !appointment_date
  ) {
    return res.status(400).json({
      error:
        "Full name, age, phone, email, doctor and date are required.",
    });
  }

  const patientAge = Number(age);

  if (
    !Number.isInteger(patientAge) ||
    patientAge < 1 ||
    patientAge > 120
  ) {
    return res.status(400).json({
      error: "Age must be a valid number between 1 and 120.",
    });
  }

  if (!isValidDate(appointment_date)) {
    return res.status(400).json({
      error: "Appointment date must use YYYY-MM-DD format.",
    });
  }

  try {
    const pool = await getPool();

    /* -----------------------------------------------------
       Get exact doctor + department
    ----------------------------------------------------- */

    const doctorResult = await pool
      .request()
      .input("doctorId", sql.UniqueIdentifier, doctor_id)
      .query(`
        SELECT
          doc.*,
          dep.name AS department_name
        FROM doctors doc
        INNER JOIN departments dep
          ON dep.id = doc.department_id
        WHERE doc.id = @doctorId
      `);

    const doctor = doctorResult.recordset[0];

    if (!doctor) {
      return res.status(404).json({
        error: "Doctor not found.",
      });
    }

    if (doctor.status !== "active") {
      return res.status(400).json({
        error: "Doctor is not active.",
      });
    }

    /* -----------------------------------------------------
       Get doctor's shift for selected date
    ----------------------------------------------------- */

    const requestedDay = getDayName(appointment_date);

    const shift = getDoctorShiftForDate(
      doctor.availability,
      appointment_date
    );

    if (!shift) {
      return res.status(400).json({
        error: `${doctor.full_name} does not work on ${requestedDay}.`,
      });
    }

    /* -----------------------------------------------------
       Optional appointment_time

       This exists only for compatibility with older
       frontend/AI code.

       If supplied:

       12:00 with 09:00-17:00
       -> accepted as identifying the shift.

       20:00 with 09:00-17:00
       -> rejected.

       It is NEVER stored as the patient's exact
       consultation time.

       The database always stores shift.start_time.
    ----------------------------------------------------- */

    if (appointment_time) {
      const normalizedRequestedTime =
        normalizeTime(appointment_time);

      if (!normalizedRequestedTime) {
        return res.status(400).json({
          error: "Invalid appointment time.",
        });
      }

      if (
        !timeFallsWithinShift(
          normalizedRequestedTime,
          shift.start_time,
          shift.end_time
        )
      ) {
        return res.status(400).json({
          error: `${normalizedRequestedTime} is outside the doctor's working shift of ${shift.start_time} - ${shift.end_time}.`,
        });
      }
    }

    const storedAppointmentTime = shift.start_time;

    /* -----------------------------------------------------
       CREATE PATIENT
    ----------------------------------------------------- */

    const patientResult = await pool
      .request()
      .input(
        "patient_code",
        sql.NVarChar,
        shortCode("P")
      )
      .input(
        "full_name",
        sql.NVarChar,
        String(full_name).trim()
      )
      .input(
        "phone",
        sql.NVarChar,
        String(phone).trim()
      )
      .input(
        "email",
        sql.NVarChar,
        String(email).trim()
      )
      .input(
        "age",
        sql.Int,
        patientAge
      )
      .query(`
        INSERT INTO patients
        (
          patient_code,
          full_name,
          phone,
          email,
          age
        )
        OUTPUT INSERTED.*
        VALUES
        (
          @patient_code,
          @full_name,
          @phone,
          @email,
          @age
        )
      `);

    const patient = patientResult.recordset[0];

    /* -----------------------------------------------------
       CREATE APPOINTMENT

       IMPORTANT:

       NO DOUBLE-BOOKING CHECK.

       Multiple patients may book:

       Same doctor
       Same date
       Same shift
    ----------------------------------------------------- */

    const appointmentResult = await pool
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
        doctor_id
      )
      .input(
        "appointment_date",
        sql.Date,
        appointment_date
      )
      .input(
        "appointment_time",
        sql.NVarChar,
        storedAppointmentTime
      )
      .input(
        "reason",
        sql.NVarChar,
        reason || null
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

    const appointment = appointmentResult.recordset[0];

    /* -----------------------------------------------------
       Send confirmation email
    ----------------------------------------------------- */

    const emailResult = await sendAppointmentEmail({
      patient,
      doctor,
      department: {
        name: doctor.department_name,
      },
      appointment: {
        ...appointment,
        shift_start: shift.start_time,
        shift_end: shift.end_time,
        shift_label: shift.label,
      },
    });

    /* -----------------------------------------------------
       Save notification status
    ----------------------------------------------------- */

    await pool
      .request()
      .input(
        "appointment_id",
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
          @appointment_id,
          'email',
          @status,
          CASE
            WHEN @status = 'sent'
            THEN SYSUTCDATETIME()
            ELSE NULL
          END
        )
      `);

    /* -----------------------------------------------------
       Return booking result
    ----------------------------------------------------- */

    return res.status(201).json({
      appointment: {
        ...appointment,
        shift_start: shift.start_time,
        shift_end: shift.end_time,
        shift_label: shift.label,
      },

      patient,

      doctor: {
        id: doctor.id,
        full_name: doctor.full_name,
        specialization: doctor.specialization,
        department_name: doctor.department_name,
      },

      shift: {
        date: appointment_date,
        day: requestedDay,
        start_time: shift.start_time,
        end_time: shift.end_time,
        label: shift.label,
      },

      email: emailResult,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Failed to book appointment.",
    });
  }
});

/* =========================================================
   GET /api/appointments

   ADMIN / RECEPTIONIST

   Includes complete shift information.
========================================================= */

router.get(
  "/",
  verifyToken,
  requireRole("admin", "receptionist"),
  async (req, res) => {
    try {
      const pool = await getPool();

      const result = await pool.request().query(`
        SELECT
          a.*,

          p.full_name AS patient_name,
          p.phone AS patient_phone,
          p.email AS patient_email,
          p.age AS patient_age,

          doc.full_name AS doctor_name,
          doc.specialization AS doctor_specialization,

          dep.name AS department_name,

          doc.availability AS doctor_availability

        FROM appointments a

        INNER JOIN patients p
          ON p.id = a.patient_id

        INNER JOIN doctors doc
          ON doc.id = a.doctor_id

        INNER JOIN departments dep
          ON dep.id = doc.department_id

        ORDER BY
          a.appointment_date DESC,
          a.appointment_time DESC
      `);

      const appointments = result.recordset.map(
        addShiftToAppointment
      );

      return res.json(appointments);
    } catch (err) {
      console.error(err);

      return res.status(500).json({
        error: "Failed to load appointments.",
      });
    }
  }
);

/* =========================================================
   GET /api/appointments/mine

   DOCTOR ONLY

   Includes complete shift information.
========================================================= */

router.get(
  "/mine",
  verifyToken,
  requireRole("doctor"),
  async (req, res) => {
    if (!req.user.doctorId) {
      return res.json([]);
    }

    try {
      const pool = await getPool();

      const result = await pool
        .request()
        .input(
          "doctorId",
          sql.UniqueIdentifier,
          req.user.doctorId
        )
        .query(`
          SELECT
            a.*,

            p.full_name AS patient_name,
            p.phone AS patient_phone,
            p.email AS patient_email,
            p.age AS patient_age,

            doc.full_name AS doctor_name,
            doc.specialization AS doctor_specialization,

            dep.name AS department_name,

            doc.availability AS doctor_availability

          FROM appointments a

          INNER JOIN patients p
            ON p.id = a.patient_id

          INNER JOIN doctors doc
            ON doc.id = a.doctor_id

          INNER JOIN departments dep
            ON dep.id = doc.department_id

          WHERE a.doctor_id = @doctorId

          ORDER BY
            a.appointment_date ASC,
            a.appointment_time ASC
        `);

      const appointments = result.recordset.map(
        addShiftToAppointment
      );

      return res.json(appointments);
    } catch (err) {
      console.error(err);

      return res.status(500).json({
        error: "Failed to load your appointments.",
      });
    }
  }
);

/* =========================================================
   GET /api/appointments/:id

   ADMIN / RECEPTIONIST / ASSIGNED DOCTOR

   Includes complete shift information.
========================================================= */

router.get("/:id", verifyToken, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input(
        "id",
        sql.UniqueIdentifier,
        req.params.id
      )
      .query(`
        SELECT
          a.*,

          p.full_name AS patient_name,
          p.phone AS patient_phone,
          p.email AS patient_email,
          p.age AS patient_age,

          doc.full_name AS doctor_name,
          doc.specialization AS doctor_specialization,

          dep.name AS department_name,

          doc.availability AS doctor_availability

        FROM appointments a

        INNER JOIN patients p
          ON p.id = a.patient_id

        INNER JOIN doctors doc
          ON doc.id = a.doctor_id

        INNER JOIN departments dep
          ON dep.id = doc.department_id

        WHERE a.id = @id
      `);

    const appointment = result.recordset[0];

    if (!appointment) {
      return res.status(404).json({
        error: "Appointment not found.",
      });
    }

    const allowed =
      req.user.role === "admin" ||
      req.user.role === "receptionist" ||
      (req.user.role === "doctor" &&
        req.user.doctorId === appointment.doctor_id);

    if (!allowed) {
      return res.status(403).json({
        error: "Not authorized to view this appointment.",
      });
    }

    return res.json(
      addShiftToAppointment(appointment)
    );
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Failed to load appointment.",
    });
  }
});

/* =========================================================
   PATCH /api/appointments/:id/status

   ADMIN / RECEPTIONIST / ASSIGNED DOCTOR
========================================================= */

router.patch("/:id/status", verifyToken, async (req, res) => {
  const { status } = req.body;

  if (
    ![
      "pending",
      "confirmed",
      "completed",
      "cancelled",
    ].includes(status)
  ) {
    return res.status(400).json({
      error: "Invalid status.",
    });
  }

  try {
    const pool = await getPool();

    /* -----------------------------------------------------
       Doctor can only modify own appointment
    ----------------------------------------------------- */

    if (req.user.role === "doctor") {
      const check = await pool
        .request()
        .input(
          "id",
          sql.UniqueIdentifier,
          req.params.id
        )
        .query(`
          SELECT doctor_id
          FROM appointments
          WHERE id = @id
        `);

      if (
        !check.recordset[0] ||
        check.recordset[0].doctor_id !== req.user.doctorId
      ) {
        return res.status(403).json({
          error: "Not your appointment.",
        });
      }
    } else if (
      !["admin", "receptionist"].includes(
        req.user.role
      )
    ) {
      return res.status(403).json({
        error: "Not authorized.",
      });
    }

    const result = await pool
      .request()
      .input(
        "id",
        sql.UniqueIdentifier,
        req.params.id
      )
      .input(
        "status",
        sql.NVarChar,
        status
      )
      .query(`
        UPDATE appointments
        SET status = @status
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (!result.recordset[0]) {
      return res.status(404).json({
        error: "Appointment not found.",
      });
    }

    return res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Failed to update appointment.",
    });
  }
});

module.exports = router;