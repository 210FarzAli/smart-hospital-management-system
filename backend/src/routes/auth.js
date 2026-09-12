const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sql, getPool } = require("../db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// ============================================================
// POST /api/auth/login
//
// Each portal sends its own role:
//
// Admin:
//   { email, password, role: "admin" }
//
// Doctor:
//   { email, password, role: "doctor" }
//
// Pharmacist:
//   { email, password, role: "pharmacist" }
//
// The role must match the role stored in staff_users.
// ============================================================

router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({
      error: "Email, password and role are required.",
    });
  }

  // Portal roles
  const allowedRoles = ["admin", "doctor", "pharmacist", "laboratory", "laboratorist"];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      error: "Invalid login role.",
    });
  }

  try {
    const pool = await getPool();

    // ----------------------------------------------------------
    // Find active account
    // ----------------------------------------------------------

    const result = await pool
      .request()
      .input(
        "email",
        sql.NVarChar,
        String(email).trim()
      )
      .query(`
        SELECT *
        FROM staff_users
        WHERE email = @email
          AND is_active = 1
      `);

    const staffUser = result.recordset[0];

    if (!staffUser) {
      return res.status(401).json({
        error: "Invalid credentials.",
      });
    }

    // ----------------------------------------------------------
    // Check password
    // ----------------------------------------------------------

    const passwordOk = await bcrypt.compare(
      password,
      staffUser.password_hash
    );

    if (!passwordOk) {
      return res.status(401).json({
        error: "Invalid credentials.",
      });
    }

    // ----------------------------------------------------------
    // Check that the account belongs to the requested portal
    // ----------------------------------------------------------

    if (staffUser.role !== role && !(staffUser.role === "admin" && ["pharmacist", "laboratorist"].includes(role))) {
      return res.status(403).json({
        error: `This account does not have ${role} access.`,
      });
    }

    // ----------------------------------------------------------
    // Doctor ID
    //
    // Doctors must be connected to a doctor profile.
    // ----------------------------------------------------------

    let doctorId = null;

    if (staffUser.role === "doctor") {
      const doctorResult = await pool
        .request()
        .input(
          "staffUserId",
          sql.UniqueIdentifier,
          staffUser.id
        )
        .query(`
          SELECT id
          FROM doctors
          WHERE staff_user_id = @staffUserId
        `);

      doctorId =
        doctorResult.recordset[0]?.id || null;

      if (!doctorId) {
        return res.status(403).json({
          error:
            "This doctor account is not linked to a doctor profile.",
        });
      }
    }

    // ----------------------------------------------------------
    // Create JWT
    // ----------------------------------------------------------

    const payload = {
      staffUserId: staffUser.id,
      role: staffUser.role,
      fullName: staffUser.full_name,
      email: staffUser.email,
      doctorId,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      {
        expiresIn:
          process.env.JWT_EXPIRES_IN || "8h",
      }
    );

    return res.json({
      token,
      user: payload,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Login failed.",
    });
  }
});

// ============================================================
// GET /api/auth/me
//
// Re-hydrate the currently logged-in user from the JWT.
// ============================================================

router.get(
  "/me",
  verifyToken,
  (req, res) => {
    res.json({
      user: req.user,
    });
  }
);

module.exports = router;