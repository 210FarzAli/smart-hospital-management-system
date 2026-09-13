const express = require("express");
const bcrypt = require("bcryptjs");
const { sql, getPool } = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// Require Admin role for all routes in this file
router.use(verifyToken, requireRole("admin"));

// ============================================================
// 1. GET /api/admin/hr
// Returns all HR personnel accounts and their employment status
// ============================================================
router.get("/hr", async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.is_active,
        u.created_at,
        e.id AS employee_id,
        e.phone,
        e.designation,
        e.joining_date,
        e.employment_status,
        d.name AS department_name
      FROM staff_users u
      LEFT JOIN employees e ON e.staff_user_id = u.id OR e.email = u.email
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE u.role = 'hr'
      ORDER BY u.created_at DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to load HR staff list:", err);
    res.status(500).json({ error: "Failed to load HR accounts." });
  }
});

// ============================================================
// 2. POST /api/admin/hr
// Admin provisions a new HR personnel account
// ============================================================
router.post("/hr", async (req, res) => {
  const {
    full_name,
    email,
    password,
    phone = null,
    designation = "Human Resources Officer",
    joining_date = null,
  } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ error: "Full name, email, and password are required." });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  try {
    const pool = await getPool();

    // Check if email already exists
    const existing = await pool
      .request()
      .input("email", sql.NVarChar, cleanEmail)
      .query("SELECT id FROM staff_users WHERE email = @email");

    if (existing.recordset.length > 0) {
      return res.status(400).json({ error: "An account with this email address already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // 1. Create staff user
    const userResult = await pool
      .request()
      .input("name", sql.NVarChar, String(full_name).trim())
      .input("email", sql.NVarChar, cleanEmail)
      .input("hash", sql.NVarChar, passwordHash)
      .query(`
        INSERT INTO staff_users (full_name, email, password_hash, role, is_active)
        OUTPUT INSERTED.*
        VALUES (@name, @email, @hash, 'hr', 1)
      `);

    const newUser = userResult.recordset[0];

    // 2. Find or create an HR / Administration department
    const deptResult = await pool.request().query(`
      SELECT TOP 1 id FROM departments WHERE name LIKE '%Human Resources%' OR name LIKE '%Administration%' OR name LIKE '%HR%'
    `);
    const deptId = deptResult.recordset[0]?.id || null;

    // 3. Create linked employee record for HR directory & payroll
    try {
      await pool
        .request()
        .input("suid", sql.UniqueIdentifier, newUser.id)
        .input("fn", sql.NVarChar, String(full_name).trim())
        .input("ph", sql.NVarChar, phone ? String(phone).trim() : "N/A")
        .input("em", sql.NVarChar, cleanEmail)
        .input("did", sql.UniqueIdentifier, deptId)
        .input("desig", sql.NVarChar, designation ? String(designation).trim() : "HR Specialist")
        .input("jd", sql.Date, joining_date || new Date().toISOString().slice(0, 10))
        .query(`
          INSERT INTO employees (
            staff_user_id, full_name, phone, email, department_id,
            designation, joining_date, employment_status
          )
          VALUES (@suid, @fn, @ph, @em, @did, @desig, @jd, 'active')
        `);
    } catch (empErr) {
      console.error("Notice creating employee record for HR account:", empErr.message);
    }

    res.status(201).json({
      user: newUser,
      message: "HR account created and provisioned successfully.",
    });
  } catch (err) {
    console.error("Failed to create HR account:", err);
    res.status(500).json({ error: "Failed to create HR account." });
  }
});

// ============================================================
// 3. PUT /api/admin/hr/:id
// Admin updates HR profile information
// ============================================================
router.put("/hr/:id", async (req, res) => {
  const { full_name, phone, designation } = req.body;

  try {
    const pool = await getPool();

    if (full_name) {
      await pool
        .request()
        .input("id", sql.UniqueIdentifier, req.params.id)
        .input("name", sql.NVarChar, String(full_name).trim())
        .query("UPDATE staff_users SET full_name = @name WHERE id = @id AND role = 'hr'");

      await pool
        .request()
        .input("id", sql.UniqueIdentifier, req.params.id)
        .input("name", sql.NVarChar, String(full_name).trim())
        .input("ph", sql.NVarChar, phone ? String(phone).trim() : null)
        .input("desig", sql.NVarChar, designation ? String(designation).trim() : null)
        .query(`
          UPDATE employees
          SET full_name = @name,
              phone = COALESCE(@ph, phone),
              designation = COALESCE(@desig, designation)
          WHERE staff_user_id = @id
        `);
    }

    res.json({ message: "HR profile updated successfully." });
  } catch (err) {
    console.error("Failed to update HR account:", err);
    res.status(500).json({ error: "Failed to update HR account." });
  }
});

// ============================================================
// 4. PATCH /api/admin/hr/:id/status
// Admin activates or deactivates HR account access
// ============================================================
router.patch("/hr/:id/status", async (req, res) => {
  const { is_active } = req.body;

  try {
    const pool = await getPool();
    const activeBit = is_active ? 1 : 0;

    const result = await pool
      .request()
      .input("id", sql.UniqueIdentifier, req.params.id)
      .input("active", sql.Bit, activeBit)
      .query(`
        UPDATE staff_users
        SET is_active = @active
        OUTPUT INSERTED.*
        WHERE id = @id AND role = 'hr'
      `);

    if (!result.recordset[0]) {
      return res.status(404).json({ error: "HR account not found." });
    }

    // Also update employment status
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, req.params.id)
      .input("status", sql.NVarChar, activeBit ? "active" : "terminated")
      .query("UPDATE employees SET employment_status = @status WHERE staff_user_id = @id");

    res.json({
      user: result.recordset[0],
      message: `HR account ${activeBit ? "activated" : "deactivated"} successfully.`,
    });
  } catch (err) {
    console.error("Failed to toggle HR account status:", err);
    res.status(500).json({ error: "Failed to toggle HR status." });
  }
});

module.exports = router;
