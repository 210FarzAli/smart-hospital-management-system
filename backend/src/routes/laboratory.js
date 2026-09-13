const express = require("express");
const { sql, getPool } = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { sendLabBookingEmail } = require("../utils/notify");

const router = express.Router();

function shortCode(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function trackingCode() {
  const year = new Date().getFullYear();
  const num = Math.floor(100000 + Math.random() * 900000);
  return `LAB-${year}-${num}`;
}

// ============================================================
// 1. PUBLIC: GET /api/laboratory/tests
// Returns all active laboratory tests and services
// ============================================================
router.get("/tests", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        id,
        test_code,
        name,
        category,
        description,
        price,
        sample_type,
        normal_range,
        unit,
        turnaround_hours,
        is_home_collection_available,
        status,
        created_at
      FROM lab_tests
      WHERE status = 'active'
      ORDER BY category, name
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to load lab tests:", err);
    res.status(500).json({ error: "Failed to load laboratory services." });
  }
});

// ============================================================
// 2. PUBLIC: GET /api/laboratory/track/:trackingId
// Patient enters their unique laboratory tracking ID
// ============================================================
router.get("/track/:trackingId", async (req, res) => {
  const trackingId = String(req.params.trackingId || "").trim();

  if (!trackingId || trackingId.length < 4) {
    return res.status(400).json({ error: "Please enter a valid Laboratory Tracking ID." });
  }

  try {
    const pool = await getPool();

    const bookingResult = await pool
      .request()
      .input("trackingId", sql.NVarChar, trackingId)
      .query(`
        SELECT
          id,
          booking_code,
          tracking_id,
          patient_name,
          patient_age,
          patient_gender,
          service_type,
          booking_date,
          booking_time,
          status,
          total_amount,
          created_at
        FROM lab_bookings
        WHERE UPPER(tracking_id) = UPPER(@trackingId)
           OR UPPER(booking_code) = UPPER(@trackingId)
      `);

    const booking = bookingResult.recordset[0];
    if (!booking) {
      return res.status(404).json({
        error: "No laboratory records found for this tracking ID. Please check the code provided on your laboratory slip.",
      });
    }

    const itemsResult = await pool
      .request()
      .input("bookingId", sql.UniqueIdentifier, booking.id)
      .query(`
        SELECT
          id,
          test_name,
          price,
          result_value,
          result_status,
          normal_range,
          unit,
          remarks,
          completed_at
        FROM lab_booking_items
        WHERE booking_id = @bookingId
        ORDER BY test_name
      `);

    res.json({
      booking: {
        ...booking,
        items: itemsResult.recordset,
      },
    });
  } catch (err) {
    console.error("Failed to track lab results:", err);
    res.status(500).json({ error: "Unable to retrieve laboratory results at this time." });
  }
});

// ============================================================
// 3. PUBLIC: POST /api/laboratory/book
// Book in-clinic or home laboratory service
// ============================================================
router.post("/book", async (req, res) => {
  const {
    patient_name,
    patient_phone,
    patient_email = null,
    patient_age = null,
    patient_gender = null,
    service_type = "in_clinic",
    booking_date,
    booking_time = null,
    home_address = null,
    notes = null,
    test_ids = [],
  } = req.body;

  if (!patient_name || !patient_phone || !booking_date) {
    return res.status(400).json({
      error: "Patient name, contact phone number, and appointment date are required.",
    });
  }

  if (!["in_clinic", "home_service"].includes(service_type)) {
    return res.status(400).json({ error: "Invalid laboratory service type selected." });
  }

  if (service_type === "home_service" && (!home_address || !home_address.trim())) {
    return res.status(400).json({
      error: "Sample collection address is required for Home Laboratory Service.",
    });
  }

  if (!Array.isArray(test_ids) || test_ids.length === 0) {
    return res.status(400).json({ error: "Please select at least one laboratory test or service." });
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // Fetch tests to calculate total amount
    const testListRequest = new sql.Request(transaction);
    const testsResult = await testListRequest.query(`
      SELECT id, name, price, normal_range, unit
      FROM lab_tests
      WHERE id IN ('${test_ids.map((id) => id.replace(/'/g, "")).join("','")}')
    `);

    const selectedTests = testsResult.recordset;
    if (selectedTests.length === 0) {
      throw new Error("None of the selected laboratory tests could be found.");
    }

    const totalAmount = selectedTests.reduce((sum, t) => sum + Number(t.price), 0);
    const booking_code = shortCode("LB");
    const tracking_id = trackingCode();

    const initialStatus = "pending";

    const bookingRequest = new sql.Request(transaction);
    const bookingResult = await bookingRequest
      .input("booking_code", sql.NVarChar, booking_code)
      .input("tracking_id", sql.NVarChar, tracking_id)
      .input("patient_name", sql.NVarChar, patient_name.trim())
      .input("patient_phone", sql.NVarChar, patient_phone.trim())
      .input("patient_email", sql.NVarChar, patient_email ? patient_email.trim() : null)
      .input("patient_age", sql.Int, patient_age ? Number(patient_age) : null)
      .input("patient_gender", sql.NVarChar, patient_gender || null)
      .input("service_type", sql.NVarChar, service_type)
      .input("booking_date", sql.Date, booking_date)
      .input("booking_time", sql.NVarChar, booking_time || null)
      .input("home_address", sql.NVarChar, home_address ? home_address.trim() : null)
      .input("notes", sql.NVarChar, notes ? notes.trim() : null)
      .input("total_amount", sql.Decimal(12, 2), totalAmount)
      .input("status", sql.NVarChar, initialStatus)
      .query(`
        INSERT INTO lab_bookings (
          booking_code, tracking_id, patient_name, patient_phone, patient_email,
          patient_age, patient_gender, service_type, booking_date, booking_time,
          home_address, notes, total_amount, status
        )
        OUTPUT INSERTED.*
        VALUES (
          @booking_code, @tracking_id, @patient_name, @patient_phone, @patient_email,
          @patient_age, @patient_gender, @service_type, @booking_date, @booking_time,
          @home_address, @notes, @total_amount, @status
        )
      `);

    const booking = bookingResult.recordset[0];

    // Insert line items
    for (const test of selectedTests) {
      const itemRequest = new sql.Request(transaction);
      await itemRequest
        .input("booking_id", sql.UniqueIdentifier, booking.id)
        .input("test_id", sql.UniqueIdentifier, test.id)
        .input("test_name", sql.NVarChar, test.name)
        .input("price", sql.Decimal(10, 2), test.price)
        .input("normal_range", sql.NVarChar, test.normal_range || null)
        .input("unit", sql.NVarChar, test.unit || null)
        .query(`
          INSERT INTO lab_booking_items (
            booking_id, test_id, test_name, price, normal_range, unit, result_status
          )
          VALUES (
            @booking_id, @test_id, @test_name, @price, @normal_range, @unit, 'pending'
          )
        `);
    }

    await transaction.commit();

    // Send laboratory booking confirmation email with tracking ID asynchronously
    sendLabBookingEmail({
      booking,
      tests: selectedTests,
      patientEmail: patient_email,
      patientName: patient_name,
    }).catch((err) => console.error("Async lab booking email failed:", err.message));

    res.status(201).json({
      booking: {
        ...booking,
        tests: selectedTests,
      },
      message:
        service_type === "home_service"
          ? "Home laboratory collection request confirmed! Our medical phlebotomist will arrive at your address on the scheduled date."
          : "Laboratory appointment registered successfully. Please present your reference at the hospital lab counter.",
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {}
    console.error("Failed to book lab appointment:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to record laboratory booking.",
    });
  }
});

// ============================================================
// 4. STAFF/ADMIN: GET /api/laboratory/bookings
// List all laboratory bookings with filters
// ============================================================
router.get(
  "/bookings",
  verifyToken,
  requireRole("admin", "laboratorist", "doctor", "pharmacist"),
  async (req, res) => {
    const { service_type, status, search } = req.query;

    try {
      const pool = await getPool();
      let query = `
        SELECT
          b.id,
          b.booking_code,
          b.tracking_id,
          b.patient_name,
          b.patient_phone,
          b.patient_email,
          b.patient_age,
          b.patient_gender,
          b.service_type,
          b.booking_date,
          b.booking_time,
          b.home_address,
          b.notes,
          b.status,
          b.total_amount,
          b.created_at,
          COUNT(i.id) AS total_tests,
          SUM(CASE WHEN i.result_status = 'completed' THEN 1 ELSE 0 END) AS completed_tests
        FROM lab_bookings b
        LEFT JOIN lab_booking_items i ON i.booking_id = b.id
        WHERE 1=1
      `;

      if (service_type && service_type !== "all") {
        query += ` AND b.service_type = '${service_type.replace(/'/g, "")}'`;
      }
      if (status && status !== "all") {
        query += ` AND b.status = '${status.replace(/'/g, "")}'`;
      }
      if (search && search.trim()) {
        const cleanSearch = search.trim().replace(/'/g, "");
        query += ` AND (
          b.patient_name LIKE '%${cleanSearch}%'
          OR b.patient_phone LIKE '%${cleanSearch}%'
          OR b.tracking_id LIKE '%${cleanSearch}%'
          OR b.booking_code LIKE '%${cleanSearch}%'
        )`;
      }

      query += `
        GROUP BY
          b.id, b.booking_code, b.tracking_id, b.patient_name, b.patient_phone,
          b.patient_email, b.patient_age, b.patient_gender, b.service_type,
          b.booking_date, b.booking_time, b.home_address, b.notes, b.status,
          b.total_amount, b.created_at
        ORDER BY b.booking_date DESC, b.created_at DESC
      `;

      const result = await pool.request().query(query);
      res.json(result.recordset);
    } catch (err) {
      console.error("Failed to list lab bookings:", err);
      res.status(500).json({ error: "Failed to load laboratory bookings." });
    }
  }
);

// ============================================================
// 5. STAFF/ADMIN: GET /api/laboratory/bookings/:id
// Get single booking with all tests
// ============================================================
router.get(
  "/bookings/:id",
  verifyToken,
  requireRole("admin", "laboratorist", "doctor", "pharmacist"),
  async (req, res) => {
    try {
      const pool = await getPool();
      const bookingResult = await pool
        .request()
        .input("id", sql.UniqueIdentifier, req.params.id)
        .query("SELECT * FROM lab_bookings WHERE id = @id");

      const booking = bookingResult.recordset[0];
      if (!booking) {
        return res.status(404).json({ error: "Laboratory booking not found." });
      }

      const itemsResult = await pool
        .request()
        .input("bookingId", sql.UniqueIdentifier, booking.id)
        .query("SELECT * FROM lab_booking_items WHERE booking_id = @bookingId ORDER BY test_name");

      res.json({
        ...booking,
        items: itemsResult.recordset,
      });
    } catch (err) {
      console.error("Failed to load booking details:", err);
      res.status(500).json({ error: "Failed to load booking details." });
    }
  }
);

// ============================================================
// 6. STAFF/ADMIN: PATCH /api/laboratory/bookings/:id/status
// Update booking workflow status
// ============================================================
router.patch(
  "/bookings/:id/status",
  verifyToken,
  requireRole("admin", "laboratorist"),
  async (req, res) => {
    const { status } = req.body;
    const allowed = [
      "booked",
      "sample_collection_pending",
      "sample_collected",
      "processing",
      "result_ready",
      "completed",
      "cancelled",
      "pending",
      "confirmed",
      "in_progress",
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    try {
      const pool = await getPool();
      const result = await pool
        .request()
        .input("id", sql.UniqueIdentifier, req.params.id)
        .input("status", sql.NVarChar, status)
        .query(`
          UPDATE lab_bookings
          SET status = @status
          OUTPUT INSERTED.*
          WHERE id = @id
        `);

      if (!result.recordset[0]) {
        return res.status(404).json({ error: "Laboratory booking not found." });
      }

      res.json(result.recordset[0]);
    } catch (err) {
      console.error("Failed to update booking status:", err);
      res.status(500).json({ error: "Failed to update booking status." });
    }
  }
);

// ============================================================
// 7. STAFF/ADMIN: POST /api/laboratory/bookings/:id/results
// Record results for one or more tests in a booking
// ============================================================
router.post(
  "/bookings/:id/results",
  verifyToken,
  requireRole("admin", "laboratorist"),
  async (req, res) => {
    const { results = [] } = req.body;

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: "No test results provided." });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      for (const item of results) {
        if (!item.itemId) continue;

        const rawStatus = String(item.status || item.resultStatus || "completed").toLowerCase();
        let normalizedStatus = "completed";
        if (rawStatus === "pending" || rawStatus === "in_progress") {
          normalizedStatus = rawStatus;
        } else {
          normalizedStatus = "completed";
        }

        let remarks = item.remarks ? String(item.remarks).trim() : null;
        if (rawStatus === "normal" || rawStatus === "abnormal") {
          const flag = rawStatus.toUpperCase();
          if (!remarks) {
            remarks = `[${flag}]`;
          } else if (!remarks.includes(`[${flag}]`)) {
            remarks = `[${flag}] ${remarks}`;
          }
        }

        const updateRequest = new sql.Request(transaction);
        await updateRequest
          .input("itemId", sql.UniqueIdentifier, item.itemId)
          .input("bookingId", sql.UniqueIdentifier, req.params.id)
          .input("resultValue", sql.NVarChar, item.resultValue ? String(item.resultValue).trim() : null)
          .input("resultStatus", sql.NVarChar, normalizedStatus)
          .input("remarks", sql.NVarChar, remarks)
          .input("normalRange", sql.NVarChar, item.normalRange ? String(item.normalRange).trim() : null)
          .input("unit", sql.NVarChar, item.unit ? String(item.unit).trim() : null)
          .query(`
            UPDATE lab_booking_items
            SET
              result_value = @resultValue,
              result_status = @resultStatus,
              remarks = @remarks,
              normal_range = COALESCE(@normalRange, normal_range),
              unit = COALESCE(@unit, unit),
              completed_at = CASE WHEN @resultStatus = 'completed' THEN SYSUTCDATETIME() ELSE completed_at END
            WHERE id = @itemId AND booking_id = @bookingId
          `);
      }

      // Check if all items for this booking are now finished
      const checkRequest = new sql.Request(transaction);
      const itemsCountResult = await checkRequest
        .input("bookingId", sql.UniqueIdentifier, req.params.id)
        .query(`
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN result_status = 'completed' THEN 1 ELSE 0 END) AS finished
          FROM lab_booking_items
          WHERE booking_id = @bookingId
        `);

      const counts = itemsCountResult.recordset[0];
      if (counts && counts.total > 0 && counts.total === counts.finished) {
        const completeBookingRequest = new sql.Request(transaction);
        await completeBookingRequest
          .input("bookingId", sql.UniqueIdentifier, req.params.id)
          .query("UPDATE lab_bookings SET status = 'completed' WHERE id = @bookingId");
      } else {
        const inProgressRequest = new sql.Request(transaction);
        await inProgressRequest
          .input("bookingId", sql.UniqueIdentifier, req.params.id)
          .query("UPDATE lab_bookings SET status = 'in_progress' WHERE id = @bookingId AND status IN ('pending', 'sample_collected', 'processing', 'confirmed', 'booked')");
      }

      await transaction.commit();

      // Return updated booking with items
      const finalItems = await pool
        .request()
        .input("bookingId", sql.UniqueIdentifier, req.params.id)
        .query("SELECT * FROM lab_booking_items WHERE booking_id = @bookingId ORDER BY test_name");

      res.json({
        message: "Laboratory results recorded successfully.",
        items: finalItems.recordset,
      });
    } catch (err) {
      try {
        await transaction.rollback();
      } catch {}
      console.error("Failed to record lab results:", err);
      res.status(500).json({ error: "Failed to record laboratory test results." });
    }
  }
);

// ============================================================
// 7b. STAFF/ADMIN: GET /api/laboratory/patient-history
// View complete laboratory testing history for a patient
// ============================================================
router.get(
  "/patient-history",
  verifyToken,
  requireRole("admin", "laboratorist", "doctor"),
  async (req, res) => {
    const { phone, search } = req.query;
    const term = (phone || search || "").trim();

    if (!term || term.length < 3) {
      return res.status(400).json({
        error: "Please provide a valid phone number or patient name (at least 3 characters).",
      });
    }

    try {
      const pool = await getPool();
      const bookingsResult = await pool
        .request()
        .input("term", sql.NVarChar, `%${term}%`)
        .query(`
          SELECT
            b.id,
            b.booking_code,
            b.tracking_id,
            b.patient_name,
            b.patient_phone,
            b.patient_email,
            b.patient_age,
            b.patient_gender,
            b.service_type,
            b.booking_date,
            b.booking_time,
            b.status,
            b.total_amount,
            b.created_at
          FROM lab_bookings b
          WHERE b.patient_phone LIKE @term
             OR b.patient_name LIKE @term
          ORDER BY b.booking_date DESC, b.created_at DESC
        `);

      const bookings = bookingsResult.recordset;
      if (bookings.length === 0) {
        return res.json([]);
      }

      const bookingIds = bookings.map((b) => b.id);
      const itemsResult = await pool.request().query(`
        SELECT
          booking_id,
          id,
          test_name,
          price,
          result_value,
          result_status,
          normal_range,
          unit,
          remarks,
          completed_at
        FROM lab_booking_items
        WHERE booking_id IN ('${bookingIds.join("','")}')
        ORDER BY test_name
      `);

      const itemsByBooking = itemsResult.recordset.reduce((acc, item) => {
        if (!acc[item.booking_id]) acc[item.booking_id] = [];
        acc[item.booking_id].push(item);
        return acc;
      }, {});

      const response = bookings.map((b) => ({
        ...b,
        items: itemsByBooking[b.id] || [],
      }));

      res.json(response);
    } catch (err) {
      console.error("Failed to load patient lab history:", err);
      res.status(500).json({ error: "Failed to load patient laboratory history." });
    }
  }
);

// ============================================================
// 8. STAFF/ADMIN: POST /api/laboratory/walk-in
// Directly register a walk-in patient at the laboratory
// ============================================================
router.post(
  "/walk-in",
  verifyToken,
  requireRole("admin", "laboratorist"),
  async (req, res) => {
    const {
      patient_name,
      patient_phone,
      patient_email = null,
      patient_age = null,
      patient_gender = null,
      notes = null,
      test_ids = [],
    } = req.body;

    if (!patient_name || !patient_phone || !test_ids.length) {
      return res.status(400).json({
        error: "Patient name, phone number, and at least one test are required.",
      });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const testListRequest = new sql.Request(transaction);
      const testsResult = await testListRequest.query(`
        SELECT id, name, price, normal_range, unit
        FROM lab_tests
        WHERE id IN ('${test_ids.map((id) => id.replace(/'/g, "")).join("','")}')
      `);

      const selectedTests = testsResult.recordset;
      const totalAmount = selectedTests.reduce((sum, t) => sum + Number(t.price), 0);
      const booking_code = shortCode("LW");
      const tracking_id = trackingCode();

      const bookingRequest = new sql.Request(transaction);
      const bookingResult = await bookingRequest
        .input("booking_code", sql.NVarChar, booking_code)
        .input("tracking_id", sql.NVarChar, tracking_id)
        .input("patient_name", sql.NVarChar, patient_name.trim())
        .input("patient_phone", sql.NVarChar, patient_phone.trim())
        .input("patient_email", sql.NVarChar, patient_email ? patient_email.trim() : null)
        .input("patient_age", sql.Int, patient_age ? Number(patient_age) : null)
        .input("patient_gender", sql.NVarChar, patient_gender || null)
        .input("service_type", sql.NVarChar, "in_clinic")
        .input("notes", sql.NVarChar, notes ? notes.trim() : null)
        .input("total_amount", sql.Decimal(12, 2), totalAmount)
        .input("registered_by", sql.UniqueIdentifier, req.user?.staffUserId || null)
        .query(`
          INSERT INTO lab_bookings (
            booking_code, tracking_id, patient_name, patient_phone, patient_email,
            patient_age, patient_gender, service_type, booking_date, notes,
            total_amount, status, registered_by
          )
          OUTPUT INSERTED.*
          VALUES (
            @booking_code, @tracking_id, @patient_name, @patient_phone, @patient_email,
            @patient_age, @patient_gender, @service_type, CAST(GETDATE() AS DATE), @notes,
            @total_amount, 'sample_collected', @registered_by
          )
        `);

      const booking = bookingResult.recordset[0];

      for (const test of selectedTests) {
        const itemRequest = new sql.Request(transaction);
        await itemRequest
          .input("booking_id", sql.UniqueIdentifier, booking.id)
          .input("test_id", sql.UniqueIdentifier, test.id)
          .input("test_name", sql.NVarChar, test.name)
          .input("price", sql.Decimal(10, 2), test.price)
          .input("normal_range", sql.NVarChar, test.normal_range || null)
          .input("unit", sql.NVarChar, test.unit || null)
          .query(`
            INSERT INTO lab_booking_items (
              booking_id, test_id, test_name, price, normal_range, unit, result_status
            )
            VALUES (
              @booking_id, @test_id, @test_name, @price, @normal_range, @unit, 'in_progress'
            )
          `);
      }

      await transaction.commit();

      res.status(201).json({
        booking: {
          ...booking,
          tests: selectedTests,
        },
        tracking_id,
        message: `Walk-in patient registered. Laboratory Tracking ID: ${tracking_id}`,
      });
    } catch (err) {
      try {
        await transaction.rollback();
      } catch {}
      console.error("Failed to register walk-in lab patient:", err);
      res.status(500).json({ error: "Failed to register walk-in patient." });
    }
  }
);

// ============================================================
// 9. STAFF/ADMIN: GET /api/laboratory/stats
// Operational statistics for Laboratory module
// ============================================================
router.get(
  "/stats",
  verifyToken,
  requireRole("admin", "laboratorist"),
  async (req, res) => {
    try {
      const pool = await getPool();

      const statsResult = await pool.request().query(`
        SELECT
          (SELECT COUNT(*) FROM lab_bookings) AS total_bookings,
          (SELECT COUNT(*) FROM lab_bookings WHERE service_type = 'home_service' AND status IN ('pending', 'confirmed')) AS pending_home_requests,
          (SELECT COUNT(*) FROM lab_bookings WHERE status = 'sample_collected' OR status = 'in_progress') AS samples_in_progress,
          (SELECT COUNT(*) FROM lab_bookings WHERE status = 'completed') AS completed_bookings,
          (SELECT COUNT(*) FROM lab_tests WHERE status = 'active') AS active_tests_count,
          (SELECT ISNULL(SUM(total_amount), 0) FROM lab_bookings WHERE status != 'cancelled') AS total_revenue
      `);

      const row = statsResult.recordset[0];
      res.json({
        totalBookings: Number(row.total_bookings),
        pendingHomeRequests: Number(row.pending_home_requests),
        samplesInProgress: Number(row.samples_in_progress),
        completedBookings: Number(row.completed_bookings),
        activeTestsCount: Number(row.active_tests_count),
        totalRevenue: Number(row.total_revenue),
      });
    } catch (err) {
      console.error("Failed to load lab stats:", err);
      res.status(500).json({ error: "Failed to load laboratory statistics." });
    }
  }
);

// ============================================================
// 10. STAFF/ADMIN: POST & PUT /api/laboratory/tests
// Manage test catalog
// ============================================================
router.post(
  "/tests",
  verifyToken,
  requireRole("admin", "laboratorist"),
  async (req, res) => {
    const {
      test_code,
      name,
      category,
      description = null,
      price,
      sample_type = "Blood",
      normal_range = null,
      unit = null,
      turnaround_hours = 24,
    } = req.body;

    if (!test_code || !name || !category || price === undefined) {
      return res.status(400).json({
        error: "Test code, name, category, and price are required.",
      });
    }

    try {
      const pool = await getPool();
      const result = await pool
        .request()
        .input("test_code", sql.NVarChar, test_code.trim().toUpperCase())
        .input("name", sql.NVarChar, name.trim())
        .input("category", sql.NVarChar, category.trim())
        .input("description", sql.NVarChar, description ? description.trim() : null)
        .input("price", sql.Decimal(10, 2), Number(price))
        .input("sample_type", sql.NVarChar, sample_type.trim())
        .input("normal_range", sql.NVarChar, normal_range ? normal_range.trim() : null)
        .input("unit", sql.NVarChar, unit ? unit.trim() : null)
        .input("turnaround_hours", sql.Int, Number(turnaround_hours) || 24)
        .query(`
          INSERT INTO lab_tests (
            test_code, name, category, description, price, sample_type,
            normal_range, unit, turnaround_hours, status
          )
          OUTPUT INSERTED.*
          VALUES (
            @test_code, @name, @category, @description, @price, @sample_type,
            @normal_range, @unit, @turnaround_hours, 'active'
          )
        `);

      res.status(201).json(result.recordset[0]);
    } catch (err) {
      console.error("Failed to create lab test:", err);
      res.status(500).json({
        error: err.message.includes("UNIQUE")
          ? "A laboratory test with this code already exists."
          : "Failed to create laboratory test.",
      });
    }
  }
);

router.put(
  "/tests/:id",
  verifyToken,
  requireRole("admin", "laboratorist"),
  async (req, res) => {
    const {
      name,
      category,
      description,
      price,
      sample_type,
      normal_range,
      unit,
      turnaround_hours,
      status,
    } = req.body;

    try {
      const pool = await getPool();
      const result = await pool
        .request()
        .input("id", sql.UniqueIdentifier, req.params.id)
        .input("name", sql.NVarChar, name ? name.trim() : null)
        .input("category", sql.NVarChar, category ? category.trim() : null)
        .input("description", sql.NVarChar, description ? description.trim() : null)
        .input("price", sql.Decimal(10, 2), price !== undefined ? Number(price) : null)
        .input("sample_type", sql.NVarChar, sample_type ? sample_type.trim() : null)
        .input("normal_range", sql.NVarChar, normal_range ? normal_range.trim() : null)
        .input("unit", sql.NVarChar, unit ? unit.trim() : null)
        .input("turnaround_hours", sql.Int, turnaround_hours ? Number(turnaround_hours) : null)
        .input("status", sql.NVarChar, status || null)
        .query(`
          UPDATE lab_tests
          SET
            name = COALESCE(@name, name),
            category = COALESCE(@category, category),
            description = COALESCE(@description, description),
            price = COALESCE(@price, price),
            sample_type = COALESCE(@sample_type, sample_type),
            normal_range = COALESCE(@normal_range, normal_range),
            unit = COALESCE(@unit, unit),
            turnaround_hours = COALESCE(@turnaround_hours, turnaround_hours),
            status = COALESCE(@status, status)
          OUTPUT INSERTED.*
          WHERE id = @id
        `);

      if (!result.recordset[0]) {
        return res.status(404).json({ error: "Laboratory test not found." });
      }

      res.json(result.recordset[0]);
    } catch (err) {
      console.error("Failed to update lab test:", err);
      res.status(500).json({ error: "Failed to update laboratory test." });
    }
  }
);

module.exports = router;
