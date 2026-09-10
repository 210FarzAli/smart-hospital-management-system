const express = require("express");
const { sql, getPool } = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/departments — public, open to patients browsing the site.
router.get("/", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      "SELECT * FROM departments WHERE status = 'active' ORDER BY name"
    );
    res.json(result.recordset.map(withServicesArray));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load departments." });
  }
});

// GET /api/departments/:id — public.
router.get("/:id", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.UniqueIdentifier, req.params.id)
      .query("SELECT * FROM departments WHERE id = @id");
    if (!result.recordset[0]) return res.status(404).json({ error: "Department not found." });
    res.json(withServicesArray(result.recordset[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load department." });
  }
});

// POST /api/departments — Admin only.
router.post("/", verifyToken, requireRole("admin"), async (req, res) => {
  const { name, description, services = [], status = "active" } = req.body;
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("name", sql.NVarChar, name)
      .input("description", sql.NVarChar, description || null)
      .input("services", sql.NVarChar, services.join(","))
      .input("status", sql.NVarChar, status)
      .query(`
        INSERT INTO departments (name, description, services, status)
        OUTPUT INSERTED.*
        VALUES (@name, @description, @services, @status)
      `);
    res.status(201).json(withServicesArray(result.recordset[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create department." });
  }
});

function withServicesArray(row) {
  return { ...row, services: row.services ? row.services.split(",").map((s) => s.trim()) : [] };
}

module.exports = router;
