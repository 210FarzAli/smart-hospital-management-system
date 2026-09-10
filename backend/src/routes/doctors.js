const express = require("express");
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
  requireRole("admin"),
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
// Admin only — create doctor
// ============================================================
router.post(
  "/",
  verifyToken,
  requireRole("admin"),
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
    } = req.body;

    try {
      const pool = await getPool();

      const result = await pool
        .request()
        .input(
          "department_id",
          sql.UniqueIdentifier,
          department_id
        )
        .input(
          "full_name",
          sql.NVarChar,
          full_name
        )
        .input(
          "specialization",
          sql.NVarChar,
          specialization
        )
        .input(
          "qualification",
          sql.NVarChar,
          qualification
        )
        .input(
          "experience_years",
          sql.Int,
          experience_years
        )
        .input(
          "consultation_fee",
          sql.Decimal(10, 2),
          consultation_fee
        )
        .input(
          "description",
          sql.NVarChar,
          description
        )
        .input(
          "availability",
          sql.NVarChar,
          JSON.stringify(availability)
        )
        .input(
          "photo_url",
          sql.NVarChar,
          photo_url
        )
        .query(`
          INSERT INTO doctors (
            department_id,
            full_name,
            specialization,
            qualification,
            experience_years,
            consultation_fee,
            description,
            availability,
            photo_url
          )
          OUTPUT INSERTED.*
          VALUES (
            @department_id,
            @full_name,
            @specialization,
            @qualification,
            @experience_years,
            @consultation_fee,
            @description,
            @availability,
            @photo_url
          )
        `);

      res.status(201).json(
        withAvailability(
          result.recordset[0]
        )
      );
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Failed to create doctor.",
      });
    }
  }
);

// ============================================================
// PUT /api/doctors/:id
//
// Admin:
// - Can update any doctor
// - Can activate/deactivate doctor
//
// Doctor:
// - Can update their own profile
// - Cannot change status
//
// IMPORTANT:
// This NEVER permanently deletes a doctor.
// "Delete" from the admin UI should send status = inactive.
// ============================================================
router.put(
  "/:id",
  verifyToken,
  async (req, res) => {
    const isAdmin =
      req.user.role === "admin";

    const isOwnDoctor =
      req.user.role === "doctor" &&
      req.user.doctorId === req.params.id;

    // Only Admin can update another doctor.
    if (!isAdmin && !isOwnDoctor) {
      return res.status(403).json({
        error:
          "You can only update your own profile.",
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

    // Only Admin can change status.
    if (
      isAdmin &&
      req.body.status !== undefined
    ) {
      fields.push("status");
    }

    const updates = fields.filter(
      (field) =>
        req.body[field] !== undefined
    );

    if (!updates.length) {
      return res.status(400).json({
        error: "No fields to update.",
      });
    }

    // Validate status.
    if (
      req.body.status !== undefined &&
      isAdmin &&
      !["active", "inactive"].includes(
        req.body.status
      )
    ) {
      return res.status(400).json({
        error:
          "Status must be active or inactive.",
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