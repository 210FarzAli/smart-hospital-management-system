const express = require("express");
const { sql, getPool } = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { sendAppointmentEmail } = require("../utils/notify");
const {
  getAvailableDoctorsForDate,
  getNextAvailableAppointmentTime,
  getDoctorAvailableDates,
  validateAppointmentSlot,
  formatTimeTo12Hour,
} = require("../utils/scheduling");

const router = express.Router();

// Require Receptionist or Admin access
router.use(verifyToken, requireRole("receptionist", "reception", "admin"));

function shortCode(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

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
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[parsed.getDay()] || null;
}

function parseDoctorSchedule(availability) {
  let schedule = [];
  try {
    schedule = JSON.parse(availability || "[]");
    if (!Array.isArray(schedule)) schedule = [];
  } catch {
    schedule = [];
  }
  return schedule;
}

// ============================================================
// 1. GET /api/reception/dashboard
// Front desk queue, appointments summary, and doctor shifts
// ============================================================
router.get("/dashboard", async (req, res) => {
  try {
    const pool = await getPool();
    const today = new Date().toISOString().slice(0, 10);

    // Today's appointments stats
    const statsResult = await pool
      .request()
      .input("today", sql.Date, today)
      .query(`
        SELECT
          COUNT(*) AS total_today,
          SUM(CASE WHEN a.status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_today,
          SUM(CASE WHEN a.status = 'checked_in' THEN 1 ELSE 0 END) AS checked_in_today,
          SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed_today,
          SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_today
        FROM appointments a
        WHERE a.appointment_date = @today
      `);

    // Real Laboratory Reports Summary
    const labSummaryResult = await pool.request().query(`
      SELECT
        COUNT(*) AS total_reports,
        SUM(CASE WHEN status IN ('pending', 'sample_pending') THEN 1 ELSE 0 END) AS pending_reports,
        SUM(CASE WHEN status IN ('in_progress', 'sample_collected') THEN 1 ELSE 0 END) AS in_progress_reports,
        SUM(CASE WHEN status IN ('completed', 'released', 'verified') THEN 1 ELSE 0 END) AS completed_reports
      FROM lab_bookings
    `);

    // Today's live appointment queue
    const queueResult = await pool
      .request()
      .input("today", sql.Date, today)
      .query(`
        SELECT
          a.id,
          a.appointment_code,
          a.appointment_date,
          a.appointment_time,
          a.status,
          a.reason,
          p.id AS patient_id,
          p.patient_code,
          p.full_name AS patient_name,
          p.phone AS patient_phone,
          p.email AS patient_email,
          p.age AS patient_age,
          d.id AS doctor_id,
          d.full_name AS doctor_name,
          d.specialization,
          d.consultation_fee,
          dept.name AS department_name
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        JOIN doctors d ON d.id = a.doctor_id
        JOIN departments dept ON dept.id = d.department_id
        WHERE a.appointment_date = @today
        ORDER BY
          CASE
            WHEN a.status = 'checked_in' THEN 1
            WHEN a.status = 'confirmed' THEN 2
            WHEN a.status = 'completed' THEN 3
            ELSE 4
          END,
          a.appointment_time ASC
      `);

    // Active doctors on duty today
    const doctorsResult = await pool.request().query(`
      SELECT
        d.id,
        d.full_name,
        d.specialization,
        d.consultation_fee,
        d.availability,
        dept.name AS department_name
      FROM doctors d
      JOIN departments dept ON dept.id = d.department_id
      WHERE d.status = 'active'
      ORDER BY dept.name ASC, d.full_name ASC
    `);

    const currentDay = getDayName(new Date());
    const checkedInDoctorIds = new Set(
      queueResult.recordset
        .filter((q) => q.status === "checked_in")
        .map((q) => q.doctor_id)
    );

    const doctorsWithStatus = doctorsResult.recordset.map((doc) => {
      const schedule = parseDoctorSchedule(doc.availability);
      const todayShift = schedule.find(
        (s) => String(s.day || "").toLowerCase() === currentDay?.toLowerCase()
      );

      let currentStatus = "OFF DUTY";
      let shiftHours = "Not scheduled today";

      if (todayShift && todayShift.start_time && todayShift.end_time) {
        shiftHours = `${todayShift.start_time} - ${todayShift.end_time}`;
        if (checkedInDoctorIds.has(doc.id)) {
          currentStatus = "BUSY / IN CONSULTATION";
        } else {
          currentStatus = "AVAILABLE / ON DUTY";
        }
      }

      return {
        ...doc,
        current_status: currentStatus,
        shift_hours: shiftHours,
        day_shift: todayShift || null,
        schedules: schedule,
      };
    });

    res.json({
      stats: statsResult.recordset[0] || {
        total_today: 0,
        confirmed_today: 0,
        checked_in_today: 0,
        completed_today: 0,
        cancelled_today: 0,
      },
      labSummary: labSummaryResult.recordset[0] || {
        total_reports: 0,
        pending_reports: 0,
        in_progress_reports: 0,
        completed_reports: 0,
      },
      queue: queueResult.recordset,
      doctors: doctorsWithStatus,
      currentDate: today,
    });
  } catch (err) {
    console.error("Failed to load reception dashboard:", err);
    res.status(500).json({ error: "Failed to load front desk dashboard." });
  }
});

// ============================================================
// SCHEDULING SERVICE ENDPOINTS (Single Source of Truth)
// ============================================================
router.get("/available-doctors", async (req, res) => {
  const { date } = req.query;
  const cleanDate = String(date || "").slice(0, 10);
  if (!cleanDate || !/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return res.status(400).json({ error: "Valid appointment date (YYYY-MM-DD) is required." });
  }
  try {
    const pool = await getPool();
    const doctors = await getAvailableDoctorsForDate(pool, cleanDate);
    res.json(doctors);
  } catch (err) {
    console.error("Failed to load available doctors for reception:", err);
    res.status(500).json({ error: "Failed to load available doctors for selected date." });
  }
});

router.get("/next-slot", async (req, res) => {
  const { doctorId, date } = req.query;
  const cleanDate = String(date || "").slice(0, 10);
  if (!doctorId || !cleanDate || !/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return res.status(400).json({ error: "doctorId and valid date (YYYY-MM-DD) are required." });
  }
  try {
    const pool = await getPool();
    const slotInfo = await getNextAvailableAppointmentTime(pool, doctorId, cleanDate);
    res.json(slotInfo);
  } catch (err) {
    console.error("Failed to calculate next slot for reception:", err);
    res.status(500).json({ error: "Failed to calculate next available appointment slot." });
  }
});

router.get("/doctor-dates", async (req, res) => {
  const { doctorId } = req.query;
  if (!doctorId) {
    return res.status(400).json({ error: "doctorId is required." });
  }
  try {
    const pool = await getPool();
    const dates = await getDoctorAvailableDates(pool, doctorId);
    res.json(dates);
  } catch (err) {
    console.error("Failed to load doctor available dates for reception:", err);
    res.status(500).json({ error: "Failed to load doctor available dates." });
  }
});

// ============================================================
// 2A. POST /api/reception/appointment
// Scheduled Appointment booking from Reception Desk
// ============================================================
router.post("/appointment", async (req, res) => {
  const {
    full_name,
    phone,
    email = null,
    age = null,
    gender = null,
    doctor_id,
    appointment_date,
    appointment_time = null,
    reason = "Scheduled OPD consultation",
  } = req.body;

  if (!full_name || !phone || !doctor_id || !appointment_date) {
    return res.status(400).json({
      error: "Patient name, phone number, doctor, and appointment date are required.",
    });
  }

  const cleanDate = String(appointment_date).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return res.status(400).json({ error: "Appointment date must use YYYY-MM-DD format." });
  }

  try {
    const pool = await getPool();

    // Validate doctor schedule and slot using single source of truth
    const validation = await validateAppointmentSlot(
      pool,
      doctor_id,
      cleanDate,
      appointment_time || null
    );

    if (!validation.valid) {
      return res.status(validation.code || 400).json({
        error: validation.error,
        nextAvailableTime: validation.nextAvailableTime || null,
      });
    }

    const assignedTime = validation.assignedTime;
    const doctor = validation.doctor;

    // 1. Find or create patient
    let patient;
    const existingPatient = await pool
      .request()
      .input("ph", sql.NVarChar, phone.trim())
      .query(`
        SELECT TOP 1 * FROM patients WHERE phone = @ph ORDER BY created_at DESC
      `);

    if (existingPatient.recordset.length > 0) {
      patient = existingPatient.recordset[0];
      if ((!patient.gender && gender) || (!patient.email && email)) {
        await pool
          .request()
          .input("id", sql.UniqueIdentifier, patient.id)
          .input("gender", sql.NVarChar, gender || patient.gender)
          .input("email", sql.NVarChar, email ? email.trim() : patient.email)
          .query(`
            UPDATE patients
            SET gender = COALESCE(@gender, gender),
                email = COALESCE(@email, email)
            WHERE id = @id
          `);
      }
    } else {
      const patientCode = shortCode("P");
      const pResult = await pool
        .request()
        .input("code", sql.NVarChar, patientCode)
        .input("fn", sql.NVarChar, full_name.trim())
        .input("ph", sql.NVarChar, phone.trim())
        .input("em", sql.NVarChar, email ? email.trim() : null)
        .input("age", sql.Int, age ? Number(age) : null)
        .input("gender", sql.NVarChar, gender ? String(gender).trim() : null)
        .query(`
          INSERT INTO patients (patient_code, full_name, phone, email, age, gender)
          OUTPUT INSERTED.*
          VALUES (@code, @fn, @ph, @em, @age, @gender)
        `);
      patient = pResult.recordset[0];
    }

    // 2. Create appointment with confirmed status
    const apptCode = shortCode("APT");
    const apptResult = await pool
      .request()
      .input("code", sql.NVarChar, apptCode)
      .input("pid", sql.UniqueIdentifier, patient.id)
      .input("did", sql.UniqueIdentifier, doctor_id)
      .input("date", sql.Date, cleanDate)
      .input("time", sql.NVarChar, assignedTime)
      .input("reason", sql.NVarChar, reason.trim())
      .input("status", sql.NVarChar, "confirmed")
      .query(`
        INSERT INTO appointments (
          appointment_code, patient_id, doctor_id,
          appointment_date, appointment_time, reason, status
        )
        OUTPUT INSERTED.*
        VALUES (
          @code, @pid, @did, @date, @time, @reason, @status
        )
      `);

    const appointment = apptResult.recordset[0];

    // Dispatch confirmation email if email provided
    const recipientEmail = email ? email.trim() : patient.email;
    if (recipientEmail) {
      try {
        await sendAppointmentEmail({
          to: recipientEmail,
          patientName: patient.full_name,
          appointmentCode: appointment.appointment_code,
          doctorName: doctor?.full_name || "Specialist Physician",
          department: doctor?.department_name || "Clinical OPD",
          date: cleanDate,
          time: validation.assignedTimeFormatted || assignedTime,
          fee: doctor?.consultation_fee || 0,
        });
      } catch (mailErr) {
        console.warn("Failed to dispatch appointment confirmation email:", mailErr.message);
      }
    }

    res.status(201).json({
      message: "Patient appointment scheduled and confirmed successfully.",
      appointment: {
        ...appointment,
        patient_name: patient.full_name,
        patient_phone: patient.phone,
        doctor_name: doctor?.full_name,
        department_name: doctor?.department_name,
        consultation_fee: doctor?.consultation_fee,
        assigned_time_formatted: validation.assignedTimeFormatted,
      },
      patient,
    });
  } catch (err) {
    console.error("Failed to book reception appointment:", err);
    res.status(500).json({ error: "Failed to schedule appointment." });
  }
});

// ============================================================
// 2B. POST /api/reception/walkin
// Fast walk-in registration and appointment booking (TODAY ONLY)
// ============================================================
router.post("/walkin", async (req, res) => {
  const {
    full_name,
    phone,
    email = null,
    age = null,
    gender = null,
    doctor_id,
    appointment_time = null,
    reason = "Walk-in consultation",
  } = req.body;

  if (!full_name || !phone || !doctor_id) {
    return res.status(400).json({
      error: "Patient name, phone number, and doctor are required for walk-in intake.",
    });
  }

  // Walk-in is locked to TODAY ONLY
  const today = new Date().toISOString().slice(0, 10);

  try {
    const pool = await getPool();

    // Validate doctor schedule and slot availability for TODAY
    const validation = await validateAppointmentSlot(
      pool,
      doctor_id,
      today,
      appointment_time || null
    );

    if (!validation.valid) {
      return res.status(validation.code || 400).json({
        error: validation.error,
        nextAvailableTime: validation.nextAvailableTime || null,
      });
    }

    const assignedTime = validation.assignedTime;
    const doctor = validation.doctor;

    // 1. Find or create patient
    let patient;
    const existingPatient = await pool
      .request()
      .input("ph", sql.NVarChar, phone.trim())
      .query(`
        SELECT TOP 1 * FROM patients WHERE phone = @ph ORDER BY created_at DESC
      `);

    if (existingPatient.recordset.length > 0) {
      patient = existingPatient.recordset[0];
      if ((!patient.gender && gender) || (!patient.email && email)) {
        await pool
          .request()
          .input("id", sql.UniqueIdentifier, patient.id)
          .input("gender", sql.NVarChar, gender || patient.gender)
          .input("email", sql.NVarChar, email ? email.trim() : patient.email)
          .query(`
            UPDATE patients
            SET gender = COALESCE(@gender, gender),
                email = COALESCE(@email, email)
            WHERE id = @id
          `);
      }
    } else {
      const patientCode = shortCode("P");
      const pResult = await pool
        .request()
        .input("code", sql.NVarChar, patientCode)
        .input("fn", sql.NVarChar, full_name.trim())
        .input("ph", sql.NVarChar, phone.trim())
        .input("em", sql.NVarChar, email ? email.trim() : null)
        .input("age", sql.Int, age ? Number(age) : null)
        .input("gender", sql.NVarChar, gender ? String(gender).trim() : null)
        .query(`
          INSERT INTO patients (patient_code, full_name, phone, email, age, gender)
          OUTPUT INSERTED.*
          VALUES (@code, @fn, @ph, @em, @age, @gender)
        `);
      patient = pResult.recordset[0];
    }

    // 2. Create appointment with checked_in status for walk-in
    const apptCode = shortCode("APT");
    const apptResult = await pool
      .request()
      .input("code", sql.NVarChar, apptCode)
      .input("pid", sql.UniqueIdentifier, patient.id)
      .input("did", sql.UniqueIdentifier, doctor_id)
      .input("date", sql.Date, today)
      .input("time", sql.NVarChar, assignedTime)
      .input("reason", sql.NVarChar, reason.trim())
      .input("status", sql.NVarChar, "checked_in")
      .query(`
        INSERT INTO appointments (
          appointment_code, patient_id, doctor_id,
          appointment_date, appointment_time, reason, status
        )
        OUTPUT INSERTED.*
        VALUES (
          @code, @pid, @did, @date, @time, @reason, @status
        )
      `);

    const appointment = apptResult.recordset[0];

    // Dispatch confirmation email if customer email provided
    const recipientEmail = email ? email.trim() : patient.email;
    if (recipientEmail) {
      try {
        await sendAppointmentEmail({
          to: recipientEmail,
          patientName: patient.full_name,
          appointmentCode: appointment.appointment_code,
          doctorName: doctor?.full_name || "Specialist Physician",
          department: doctor?.department_name || "Clinical OPD",
          date: today,
          time: validation.assignedTimeFormatted || assignedTime,
          fee: doctor?.consultation_fee || 0,
        });
      } catch (mailErr) {
        console.warn("Failed to dispatch appointment confirmation email:", mailErr.message);
      }
    }

    res.status(201).json({
      message: "Walk-in patient registered and checked in successfully.",
      appointment: {
        ...appointment,
        patient_name: patient.full_name,
        patient_phone: patient.phone,
        doctor_name: doctor?.full_name,
        department_name: doctor?.department_name,
        consultation_fee: doctor?.consultation_fee,
        assigned_time_formatted: validation.assignedTimeFormatted,
      },
      patient,
    });
  } catch (err) {
    console.error("Failed to register walk-in patient:", err);
    res.status(500).json({ error: "Failed to complete walk-in appointment registration." });
  }
});

// ============================================================
// 3. PUT /api/reception/checkin/:id
// Mark patient as checked in at reception counter
// ============================================================
router.put("/checkin/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .query(`
        UPDATE appointments
        SET status = 'checked_in'
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Appointment not found." });
    }

    res.json({
      appointment: result.recordset[0],
      message: "Patient marked as checked-in at reception counter.",
    });
  } catch (err) {
    console.error("Failed to check in appointment:", err);
    res.status(500).json({ error: "Failed to record check-in." });
  }
});

// ============================================================
// 4. GET /api/reception/search
// Centralized multi-code and patient phone lookup
// ============================================================
router.get("/search", async (req, res) => {
  const term = String(req.query.q || "").trim();

  if (!term || term.length < 2) {
    return res.status(400).json({ error: "Search term must be at least 2 characters." });
  }

  try {
    const pool = await getPool();
    const clean = term.replace(/'/g, "");

    const pattern = `%${clean}%`;

    // 1. Search Patients
    const patientsResult = await pool
      .request()
      .input("pat", sql.NVarChar, pattern)
      .query(`
        SELECT TOP 10
          p.id,
          p.patient_code,
          p.full_name,
          p.phone,
          p.email,
          p.age,
          p.gender,
          p.created_at
        FROM patients p
        WHERE
          p.patient_code LIKE @pat
          OR p.full_name LIKE @pat
          OR p.phone LIKE @pat
          OR p.email LIKE @pat
        ORDER BY p.created_at DESC
      `);

    // 2. Search Doctors (e.g. "raza", "Adeel", "Cardiology")
    const doctorsResult = await pool
      .request()
      .input("pat", sql.NVarChar, pattern)
      .query(`
        SELECT TOP 10
          d.id,
          d.full_name,
          d.specialization,
          d.phone,
          d.email,
          d.consultation_fee,
          d.availability,
          dept.name AS department_name
        FROM doctors d
        LEFT JOIN departments dept ON dept.id = d.department_id
        WHERE
          d.full_name LIKE @pat
          OR d.specialization LIKE @pat
          OR d.phone LIKE @pat
          OR dept.name LIKE @pat
        ORDER BY d.full_name ASC
      `);

    // 3. Search Appointments
    const appointmentsResult = await pool
      .request()
      .input("pat", sql.NVarChar, pattern)
      .query(`
        SELECT TOP 10
          a.id,
          a.appointment_code,
          a.appointment_date,
          a.appointment_time,
          a.status,
          a.reason,
          p.patient_code,
          p.full_name AS patient_name,
          p.phone AS patient_phone,
          d.full_name AS doctor_name,
          dept.name AS department_name,
          d.consultation_fee
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        JOIN doctors d ON d.id = a.doctor_id
        JOIN departments dept ON dept.id = d.department_id
        WHERE
          a.appointment_code LIKE @pat
          OR p.patient_code LIKE @pat
          OR p.phone LIKE @pat
          OR p.full_name LIKE @pat
          OR d.full_name LIKE @pat
        ORDER BY a.appointment_date DESC
      `);

    // 4. Search Lab Bookings (e.g. tracking_id "LAB-2026-...", patient_name, phone)
    const labResult = await pool
      .request()
      .input("pat", sql.NVarChar, pattern)
      .query(`
        SELECT TOP 10
          b.id,
          b.booking_code,
          b.tracking_id,
          b.patient_name,
          b.patient_phone,
          b.service_type,
          b.booking_date,
          b.booking_time,
          b.status,
          b.total_amount,
          b.created_at
        FROM lab_bookings b
        WHERE
          b.tracking_id LIKE @pat
          OR b.booking_code LIKE @pat
          OR b.patient_phone LIKE @pat
          OR b.patient_name LIKE @pat
        ORDER BY b.created_at DESC
      `);

    // 5. Search Pharmacy Online Orders
    const pharmacyResult = await pool
      .request()
      .input("pat", sql.NVarChar, pattern)
      .query(`
        SELECT TOP 10
          o.id,
          o.order_code,
          o.customer_name,
          o.customer_phone,
          o.delivery_address,
          o.total_amount,
          o.status,
          o.created_at
        FROM pharmacy_online_orders o
        WHERE
          o.order_code LIKE @pat
          OR o.customer_phone LIKE @pat
          OR o.customer_name LIKE @pat
        ORDER BY o.created_at DESC
      `);

    // 6. Search Medicines (stock check)
    const medicinesResult = await pool
      .request()
      .input("pat", sql.NVarChar, pattern)
      .query(`
        SELECT TOP 10
          m.id,
          m.name,
          m.category,
          m.unit_price,
          COALESCE(SUM(CASE WHEN b.expiry_date >= CAST(GETDATE() AS DATE) THEN b.quantity ELSE 0 END), 0) AS stock_quantity
        FROM medicines m
        LEFT JOIN medicine_batches b ON b.medicine_id = m.id
        WHERE m.status = 'active'
          AND (m.name LIKE @pat OR m.category LIKE @pat)
        GROUP BY m.id, m.name, m.category, m.unit_price
        ORDER BY m.name ASC
      `);

    res.json({
      patients: patientsResult.recordset,
      doctors: doctorsResult.recordset,
      appointments: appointmentsResult.recordset,
      labBookings: labResult.recordset,
      pharmacyOrders: pharmacyResult.recordset,
      medicines: medicinesResult.recordset,
      searchTerm: term,
    });
  } catch (err) {
    console.error("Failed to perform reception search:", err);
    res.status(500).json({ error: "Failed to search patient records." });
  }
});

// ============================================================
// 5. GET /api/reception/patient/:idOrPhone
// Operational Patient Profile (Visits, Appointments, Lab Tests)
// ============================================================
router.get("/patient/:idOrPhone", async (req, res) => {
  const param = String(req.params.idOrPhone || "").trim();

  if (!param) {
    return res.status(400).json({ error: "Patient identifier is required." });
  }

  try {
    const pool = await getPool();
    const clean = param.replace(/'/g, "");

    // 1. Try patients table directly
    let patientResult = await pool
      .request()
      .input("clean", sql.NVarChar, clean)
      .query(`
        SELECT TOP 1 id, patient_code, full_name, phone, email, age, gender, created_at
        FROM patients
        WHERE CAST(id AS NVARCHAR(50)) = @clean
           OR phone = @clean
           OR patient_code = @clean
        ORDER BY created_at DESC
      `);

    let patient = patientResult.recordset[0];

    // 2. If not found, try appointment code
    if (!patient) {
      const aptMatch = await pool
        .request()
        .input("clean", sql.NVarChar, clean)
        .query(`
          SELECT TOP 1 p.id, p.patient_code, p.full_name, p.phone, p.email, p.age, p.gender, p.created_at
          FROM appointments a
          JOIN patients p ON p.id = a.patient_id
          WHERE a.appointment_code = @clean OR CAST(a.id AS NVARCHAR(50)) = @clean
        `);
      if (aptMatch.recordset.length > 0) {
        patient = aptMatch.recordset[0];
      }
    }

    // 3. If not found, try lab booking
    if (!patient) {
      const labMatch = await pool
        .request()
        .input("clean", sql.NVarChar, clean)
        .query(`
          SELECT TOP 1 patient_name, patient_phone, patient_email, patient_age, patient_gender, created_at
          FROM lab_bookings
          WHERE tracking_id = @clean
             OR booking_code = @clean
             OR patient_phone = @clean
          ORDER BY created_at DESC
        `);

      if (labMatch.recordset.length > 0) {
        const lm = labMatch.recordset[0];
        const existingP = await pool
          .request()
          .input("ph", sql.NVarChar, lm.patient_phone)
          .query(`
            SELECT TOP 1 id, patient_code, full_name, phone, email, age, gender, created_at
            FROM patients
            WHERE phone = @ph
          `);
        if (existingP.recordset.length > 0) {
          patient = existingP.recordset[0];
        } else {
          patient = {
            id: null,
            patient_code: "GUEST-LAB",
            full_name: lm.patient_name,
            phone: lm.patient_phone,
            email: lm.patient_email,
            age: lm.patient_age,
            gender: lm.patient_gender,
            created_at: lm.created_at,
          };
        }
      }
    }

    // 4. If not found, try pharmacy order
    if (!patient) {
      const ordMatch = await pool
        .request()
        .input("clean", sql.NVarChar, clean)
        .query(`
          SELECT TOP 1 customer_name, customer_phone, customer_email, delivery_address, created_at
          FROM pharmacy_online_orders
          WHERE order_code = @clean
             OR customer_phone = @clean
          ORDER BY created_at DESC
        `);

      if (ordMatch.recordset.length > 0) {
        const om = ordMatch.recordset[0];
        const existingP = await pool
          .request()
          .input("ph", sql.NVarChar, om.customer_phone)
          .query(`
            SELECT TOP 1 id, patient_code, full_name, phone, email, age, gender, created_at
            FROM patients
            WHERE phone = @ph
          `);
        if (existingP.recordset.length > 0) {
          patient = existingP.recordset[0];
        } else {
          patient = {
            id: null,
            patient_code: "GUEST-PHARM",
            full_name: om.customer_name,
            phone: om.customer_phone,
            email: om.customer_email,
            age: null,
            gender: null,
            created_at: om.created_at,
          };
        }
      }
    }

    if (!patient) {
      return res.status(404).json({ error: "Patient record not found." });
    }

    const patientPhone = patient.phone;

    // 2. Fetch all appointments for this patient
    let appointmentsResult = { recordset: [] };
    if (patient.id || patientPhone) {
      const apptReq = pool.request();
      const apptWhere = [];
      if (patient.id) {
        apptReq.input("pid", sql.UniqueIdentifier, patient.id);
        apptWhere.push("a.patient_id = @pid");
      }
      if (patientPhone) {
        apptReq.input("pph", sql.NVarChar, patientPhone);
        apptWhere.push("p.phone = @pph");
      }
      appointmentsResult = await apptReq.query(`
        SELECT
          a.id,
          a.appointment_code,
          a.appointment_date,
          a.appointment_time,
          a.status,
          a.reason,
          d.full_name AS doctor_name,
          dept.name AS department_name,
          d.consultation_fee
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        JOIN doctors d ON d.id = a.doctor_id
        JOIN departments dept ON dept.id = d.department_id
        WHERE ${apptWhere.join(" OR ")}
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
      `);
    }

    // 3. Fetch all lab bookings for this patient
    let formattedLabBookings = [];
    if (patientPhone) {
      const labBookingsResult = await pool
        .request()
        .input("pph", sql.NVarChar, patientPhone)
        .query(`
          SELECT
            b.id,
            b.booking_code,
            b.tracking_id,
            b.patient_name,
            b.patient_phone,
            b.service_type,
            b.booking_date,
            b.booking_time,
            b.status,
            b.total_amount,
            b.created_at
          FROM lab_bookings b
          WHERE b.patient_phone = @pph
          ORDER BY b.booking_date DESC, b.created_at DESC
        `);

      const labIds = labBookingsResult.recordset.map((b) => b.id);
      let labItemsByBooking = {};
      if (labIds.length > 0) {
        const itemsRes = await pool.request().query(`
          SELECT booking_id, test_name, price, result_value, normal_range, unit, remarks, result_status
          FROM lab_booking_items
          WHERE booking_id IN ('${labIds.join("','")}')
          ORDER BY test_name ASC
        `);
        labItemsByBooking = itemsRes.recordset.reduce((acc, item) => {
          if (!acc[item.booking_id]) acc[item.booking_id] = [];
          acc[item.booking_id].push(item);
          return acc;
        }, {});
      }

      formattedLabBookings = labBookingsResult.recordset.map((b) => ({
        ...b,
        items: labItemsByBooking[b.id] || [],
      }));
    }

    // 4. Fetch pharmacy orders
    let pharmacyOrders = [];
    if (patientPhone) {
      const pharmacyOrdersResult = await pool
        .request()
        .input("pph", sql.NVarChar, patientPhone)
        .query(`
          SELECT
            o.id,
            o.order_code,
            o.delivery_address,
            o.total_amount,
            o.status,
            o.created_at
          FROM pharmacy_online_orders o
          WHERE o.customer_phone = @pph
          ORDER BY o.created_at DESC
        `);
      pharmacyOrders = pharmacyOrdersResult.recordset;
    }

    res.json({
      patient,
      appointments: appointmentsResult.recordset,
      labBookings: formattedLabBookings,
      pharmacyOrders,
    });
  } catch (err) {
    console.error("Failed to load patient profile:", err);
    res.status(500).json({ error: "Failed to load patient profile." });
  }
});

module.exports = router;
