const express = require("express");
const bcrypt = require("bcryptjs");
const { sql, getPool } = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// ============================================================
// GET /api/doctors
// Public — only active doctors
// ============================================================
router.get("/", async (req, res) => {
  const { departmentId, search } = req.query;

  try {
    const pool = await getPool();
    const request = pool.request();

    let query = `
      SELECT d.*, dep.name AS department_name
      FROM doctors d
      JOIN departments dep ON dep.id = d.department_id
      WHERE d.status = 'active'
    `;

    if (departmentId) {
      request.input(
        "departmentId",
        sql.UniqueIdentifier,
        departmentId
      );

      query += " AND d.department_id = @departmentId";
    }

    if (search) {
      request.input(
        "search",
        sql.NVarChar,
        `%${search}%`
      );

      query += `
        AND (
          d.full_name LIKE @search
          OR d.specialization LIKE @search
        )
      `;
    }

    query += " ORDER BY d.rating DESC";

    const result = await request.query(query);

    res.json(
      result.recordset.map(withAvailability)
    );
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to load doctors.",
    });
  }
});

// ============================================================
// GET /api/doctors/admin
// Admin only — returns ACTIVE + INACTIVE doctors
// ============================================================
router.get(
  "/admin",
  verifyToken,
  requireRole("admin", "hr"),
  async (req, res) => {
    const {
      status,
      departmentId,
      search,
    } = req.query;

    try {
      const pool = await getPool();
      const request = pool.request();

      let query = `
        SELECT d.*, dep.name AS department_name
        FROM doctors d
        JOIN departments dep
          ON dep.id = d.department_id
        WHERE 1 = 1
      `;

      // Status filter
      if (
        status &&
        ["active", "inactive"].includes(status)
      ) {
        request.input(
          "status",
          sql.NVarChar,
          status
        );

        query += " AND d.status = @status";
      }

      // Department filter
      if (departmentId) {
        request.input(
          "departmentId",
          sql.UniqueIdentifier,
          departmentId
        );

        query +=
          " AND d.department_id = @departmentId";
      }

      // Search
      if (search) {
        request.input(
          "search",
          sql.NVarChar,
          `%${search}%`
        );

        query += `
          AND (
            d.full_name LIKE @search
            OR d.specialization LIKE @search
            OR dep.name LIKE @search
          )
        `;
      }

      query += `
        ORDER BY
          CASE
            WHEN d.status = 'active' THEN 0
            ELSE 1
          END,
          d.full_name ASC
      `;

      const result =
        await request.query(query);

      res.json(
        result.recordset.map(withAvailability)
      );
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Failed to load admin doctors.",
      });
    }
  }
);

// ============================================================
// GET /api/doctors/patients
// Doctor only — patients + complete appointment history
// including previous consultation notes and prescriptions.
// ============================================================
router.get(
  "/patients",
  verifyToken,
  requireRole("doctor"),
  async (req, res) => {
    if (!req.user.doctorId) {
      return res.status(400).json({
        error: "No doctor profile linked to this account.",
      });
    }

    try {
      const pool = await getPool();

      // --------------------------------------------------------
      // Get patients who have appointments with this doctor
      // --------------------------------------------------------
      const patientsResult = await pool
        .request()
        .input(
          "doctorId",
          sql.UniqueIdentifier,
          req.user.doctorId
        )
        .query(`
          SELECT
            p.id,
            p.full_name,
            p.age,
            p.phone,
            p.email,
            COUNT(a.id) AS appointment_count,
            MAX(a.appointment_date) AS last_appointment_date
          FROM patients p
          INNER JOIN appointments a
            ON a.patient_id = p.id
          WHERE a.doctor_id = @doctorId
          GROUP BY
            p.id,
            p.full_name,
            p.age,
            p.phone,
            p.email
          ORDER BY
            p.full_name ASC
        `);

      // --------------------------------------------------------
      // Get appointment history
      // --------------------------------------------------------
      const appointmentsResult =
        await pool
          .request()
          .input(
            "doctorId",
            sql.UniqueIdentifier,
            req.user.doctorId
          )
          .query(`
            SELECT
              a.id,
              a.patient_id,
              a.appointment_date,
              a.appointment_time,
              a.status,
              a.reason
            FROM appointments a
            WHERE a.doctor_id = @doctorId
            ORDER BY
              a.appointment_date DESC,
              a.appointment_time DESC
          `);

      const appointments =
        appointmentsResult.recordset;

      // --------------------------------------------------------
      // Add consultation + prescription history
      // to each completed appointment.
      // --------------------------------------------------------
      const appointmentsWithHistory =
        await Promise.all(
          appointments.map(
            async (appointment) => {
              if (
                String(
                  appointment.status
                ).toLowerCase() !==
                "completed"
              ) {
                return {
                  ...appointment,
                  consultation: null,
                };
              }

              const prescriptionResult =
                await pool
                  .request()
                  .input(
                    "appointmentId",
                    sql.UniqueIdentifier,
                    appointment.id
                  )
                  .query(`
                    SELECT TOP 1
                      pr.id,
                      pr.consultation_notes,
                      pr.created_at
                    FROM prescriptions pr
                    WHERE
                      pr.appointment_id =
                      @appointmentId
                    ORDER BY
                      pr.created_at DESC
                  `);

              const prescription =
                prescriptionResult
                  .recordset[0];

              if (!prescription) {
                return {
                  ...appointment,
                  consultation: null,
                };
              }

              const detailsResult =
                await pool
                  .request()
                  .input(
                    "prescriptionId",
                    sql.UniqueIdentifier,
                    prescription.id
                  )
                  .query(`
                    SELECT
                      id,
                      medicine_name,
                      quantity,
                      dosage,
                      duration
                    FROM prescription_details
                    WHERE
                      prescription_id =
                      @prescriptionId
                    ORDER BY id
                  `);

              return {
                ...appointment,

                consultation: {
                  id: prescription.id,
                  consultation_notes:
                    prescription.consultation_notes,
                  created_at:
                    prescription.created_at,
                  medicines:
                    detailsResult.recordset,
                },
              };
            }
          )
        );

      // --------------------------------------------------------
      // Attach appointment history to each patient
      // --------------------------------------------------------
      const patients =
        patientsResult.recordset.map(
          (patient) => ({
            ...patient,

            appointment_count: Number(
              patient.appointment_count
            ),

            appointments:
              appointmentsWithHistory.filter(
                (appointment) =>
                  appointment.patient_id ===
                  patient.id
              ),
          })
        );

      return res.json(patients);
    } catch (err) {
      console.error(err);

      return res.status(500).json({
        error: "Failed to load your patients.",
      });
    }
  }
);

// ============================================================
// GET /api/doctors/:id
// Public — get one doctor
// ============================================================
router.get("/:id", async (req, res) => {
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
        SELECT d.*, dep.name AS department_name
        FROM doctors d
        JOIN departments dep
          ON dep.id = d.department_id
        WHERE d.id = @id
      `);

    if (!result.recordset[0]) {
      return res.status(404).json({
        error: "Doctor not found.",
      });
    }

    res.json(
      withAvailability(result.recordset[0])
    );
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to load doctor.",
    });
  }
});

// ============================================================
// POST /api/doctors
// HR only — create doctor & employment record
// ============================================================
router.post(
  "/",
  verifyToken,
  requireRole("hr", "no-admin"),
  async (req, res) => {
    const {
      department_id,
      full_name,
      specialization,
      qualification = null,
      experience_years = 0,
      consultation_fee = 0,
      description = null,
      availability = [],
      photo_url = null,
      email = null,
      password = null,
      phone = null,
      joining_date = null,
    } = req.body;

    if (!department_id || !full_name || !specialization) {
      return res.status(400).json({ error: "Department, full name, and specialization are required." });
    }

    try {
      const pool = await getPool();

      // 1. If email & password provided, provision staff login account
      let staffUserId = null;
      if (email && password) {
        const cleanEmail = String(email).trim().toLowerCase();
        const existingUser = await pool
          .request()
          .input("email", sql.NVarChar, cleanEmail)
          .query("SELECT id FROM staff_users WHERE email = @email");

        if (existingUser.recordset.length > 0) {
          staffUserId = existingUser.recordset[0].id;
        } else {
          const passwordHash = await bcrypt.hash(password, 10);
          const userResult = await pool
            .request()
            .input("name", sql.NVarChar, String(full_name).trim())
            .input("email", sql.NVarChar, cleanEmail)
            .input("hash", sql.NVarChar, passwordHash)
            .query(`
              INSERT INTO staff_users (full_name, email, password_hash, role, is_active)
              OUTPUT INSERTED.id
              VALUES (@name, @email, @hash, 'doctor', 1)
            `);
          staffUserId = userResult.recordset[0].id;
        }
      }

      // 2. Create doctor clinical profile
      const result = await pool
        .request()
        .input("department_id", sql.UniqueIdentifier, department_id)
        .input("staff_user_id", sql.UniqueIdentifier, staffUserId)
        .input("full_name", sql.NVarChar, String(full_name).trim())
        .input("specialization", sql.NVarChar, String(specialization).trim())
        .input("qualification", sql.NVarChar, qualification)
        .input("experience_years", sql.Int, Number(experience_years) || 0)
        .input("consultation_fee", sql.Decimal(10, 2), Number(consultation_fee) || 0)
        .input("description", sql.NVarChar, description)
        .input("availability", sql.NVarChar, JSON.stringify(availability || []))
        .input("photo_url", sql.NVarChar, photo_url)
        .query(`
          INSERT INTO doctors (
            department_id,
            staff_user_id,
            full_name,
            specialization,
            qualification,
            experience_years,
            consultation_fee,
            description,
            availability,
            photo_url,
            status
          )
          OUTPUT INSERTED.*
          VALUES (
            @department_id,
            @staff_user_id,
            @full_name,
            @specialization,
            @qualification,
            @experience_years,
            @consultation_fee,
            @description,
            @availability,
            @photo_url,
            'active'
          )
        `);

      const doctor = result.recordset[0];

      // 3. Also record in employees directory for HR tracking
      if (email || phone) {
        try {
          await pool
            .request()
            .input("staff_user_id", sql.UniqueIdentifier, staffUserId)
            .input("full_name", sql.NVarChar, String(full_name).trim())
            .input("phone", sql.NVarChar, phone ? String(phone).trim() : "N/A")
            .input("email", sql.NVarChar, email ? String(email).trim().toLowerCase() : `dr.${doctor.id.slice(0, 8)}@hospital.local`)
            .input("department_id", sql.UniqueIdentifier, department_id)
            .input("designation", sql.NVarChar, `Consultant ${specialization}`)
            .input("joining_date", sql.Date, joining_date || new Date().toISOString().slice(0, 10))
            .input("qualification", sql.NVarChar, qualification)
            .query(`
              IF NOT EXISTS (SELECT id FROM employees WHERE email = @email OR (full_name = @full_name AND department_id = @department_id))
              BEGIN
                INSERT INTO employees (
                  staff_user_id, full_name, phone, email, department_id,
                  designation, joining_date, employment_status, qualification
                )
                VALUES (
                  @staff_user_id, @full_name, @phone, @email, @department_id,
                  @designation, @joining_date, 'active', @qualification
                );
              END
            `);
        } catch (empErr) {
          console.error("Doctor employee record creation notice:", empErr.message);
        }
      }

      res.status(201).json(withAvailability(doctor));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create doctor employment record." });
    }
  }
);

// ============================================================
// PUT /api/doctors/:id
//
// HR:
// - Can update any doctor's employment/profile
// - Can activate/deactivate doctor
//
// Doctor:
// - Can update their own profile
// - Cannot change status
//
// Admin:
// - Cannot modify doctor records (managed by HR)
// ============================================================
router.put(
  "/:id",
  verifyToken,
  async (req, res) => {
    const isHR = req.user.role === "hr";
    const isOwnDoctor =
      req.user.role === "doctor" &&
      req.user.doctorId === req.params.id;

    if (!isHR && !isOwnDoctor) {
      if (req.user.role === "admin") {
        return res.status(403).json({
          error: "Doctor employment and profile management is restricted to Human Resources (HR).",
        });
      }
      return res.status(403).json({
        error: "You can only update your own profile.",
      });
    }

    const fields = [
      "department_id",
      "full_name",
      "specialization",
      "qualification",
      "experience_years",
      "consultation_fee",
      "description",
      "photo_url",
      "availability",
    ];

    // Only HR can change status.
    if (isHR && req.body.status !== undefined) {
      fields.push("status");
    }

    const updates = fields.filter(
      (field) => req.body[field] !== undefined
    );

    if (!updates.length) {
      return res.status(400).json({
        error: "No fields to update.",
      });
    }

    // Validate status.
    if (
      req.body.status !== undefined &&
      isHR &&
      !["active", "inactive"].includes(req.body.status)
    ) {
      return res.status(400).json({
        error: "Status must be active or inactive.",
      });
    }

    try {
      const pool = await getPool();

      const request = pool
        .request()
        .input(
          "id",
          sql.UniqueIdentifier,
          req.params.id
        );

      for (const field of updates) {
        let type = sql.NVarChar;

        if (field === "department_id") {
  type = sql.UniqueIdentifier;
} else if (field === "experience_years") {
  type = sql.Int;
} else if (field === "consultation_fee") {
  type = sql.Decimal(10, 2);
} else if (field === "availability") {
  type = sql.NVarChar;
}

        let value = req.body[field];

if (field === "availability") {
  value = JSON.stringify(value || []);
}

request.input(
  field,
  type,
  value
);
      }

      const setClause = updates
        .map(
          (field) =>
            `${field} = @${field}`
        )
        .join(", ");

      const result =
        await request.query(`
          UPDATE doctors
          SET ${setClause}
          OUTPUT INSERTED.*
          WHERE id = @id
        `);

      if (!result.recordset[0]) {
        return res.status(404).json({
          error: "Doctor not found.",
        });
      }

      return res.json(
        withAvailability(
          result.recordset[0]
        )
      );
    } catch (err) {
      console.error(err);

      return res.status(500).json({
        error: "Failed to update doctor.",
      });
    }
  }
);

// ============================================================
// Convert availability JSON string into an array
// ============================================================
function withAvailability(row) {
  let availability = [];

  try {
    availability = JSON.parse(
      row.availability || "[]"
    );
  } catch {
    // Ignore invalid availability JSON.
  }

  return {
    ...row,
    availability,
  };
}

module.exports = router;  