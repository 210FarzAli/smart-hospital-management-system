const express = require("express");
const { sql, getPool } = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// ============================================================
// GET /api/reviews
// Public — returns approved hospital reviews only.
// Reviews are no longer connected to individual doctors.
// ============================================================
router.get("/", async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        r.id,
        r.patient_id,
        r.reviewer_name,
        r.rating,
        r.comment,
        r.is_verified_patient,
        r.is_approved,
        r.is_hidden,
        r.created_at
      FROM reviews r
      WHERE r.is_approved = 1
        AND r.is_hidden = 0
        AND r.doctor_id IS NULL
      ORDER BY r.created_at DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to load hospital reviews.",
    });
  }
});

// ============================================================
// POST /api/reviews
// Public — anyone can submit a hospital review.
// No doctor is selected.
// ============================================================
router.post("/", async (req, res) => {
  const {
    patient_id = null,
    reviewer_name,
    rating,
    comment = null,
    is_verified_patient = false,
  } = req.body;

  if (!reviewer_name || !rating) {
    return res.status(400).json({
      error: "reviewer_name and rating are required.",
    });
  }

  const numericRating = Number(rating);

  if (
    !Number.isInteger(numericRating) ||
    numericRating < 1 ||
    numericRating > 5
  ) {
    return res.status(400).json({
      error: "Rating must be between 1 and 5.",
    });
  }

  if (
    typeof reviewer_name !== "string" ||
    reviewer_name.trim().length < 2
  ) {
    return res.status(400).json({
      error: "Please enter a valid name.",
    });
  }

  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input(
        "patient_id",
        sql.UniqueIdentifier,
        patient_id
      )
      .input(
        "reviewer_name",
        sql.NVarChar,
        reviewer_name.trim()
      )
      .input(
        "rating",
        sql.Int,
        numericRating
      )
      .input(
        "comment",
        sql.NVarChar,
        comment
          ? String(comment).trim()
          : null
      )
      .input(
        "is_verified_patient",
        sql.Bit,
        is_verified_patient ? 1 : 0
      )
      .query(`
        INSERT INTO reviews (
          doctor_id,
          patient_id,
          reviewer_name,
          rating,
          comment,
          is_verified_patient,
          is_approved,
          is_hidden
        )
        OUTPUT
          INSERTED.id,
          INSERTED.patient_id,
          INSERTED.reviewer_name,
          INSERTED.rating,
          INSERTED.comment,
          INSERTED.is_verified_patient,
          INSERTED.is_approved,
          INSERTED.is_hidden,
          INSERTED.created_at
        VALUES (
          NULL,
          @patient_id,
          @reviewer_name,
          @rating,
          @comment,
          @is_verified_patient,
          1,
          0
        )
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to submit hospital review.",
    });
  }
});

// ============================================================
// GET /api/reviews/admin
// Admin only — all hospital reviews, including hidden ones.
// IMPORTANT: This route MUST be before /:id.
// ============================================================
router.get(
  "/admin",
  verifyToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const pool = await getPool();

      const result = await pool.request().query(`
        SELECT
          r.id,
          r.patient_id,
          r.reviewer_name,
          r.rating,
          r.comment,
          r.is_verified_patient,
          r.is_approved,
          r.is_hidden,
          r.created_at
        FROM reviews r
        WHERE r.doctor_id IS NULL
        ORDER BY r.created_at DESC
      `);

      res.json(result.recordset);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Failed to load hospital reviews.",
      });
    }
  }
);

// ============================================================
// GET /api/reviews/admin/summary
// Admin only — overall hospital review statistics.
// ============================================================
router.get(
  "/admin/summary",
  verifyToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const pool = await getPool();

      const result = await pool.request().query(`
        SELECT
          COUNT(*) AS total_reviews,
          ISNULL(
            AVG(CAST(rating AS FLOAT)),
            0
          ) AS average_rating
        FROM reviews
        WHERE doctor_id IS NULL
          AND is_approved = 1
          AND is_hidden = 0
      `);

      const row = result.recordset[0];

      res.json({
        totalReviews: Number(row.total_reviews),
        averageRating: Number(row.average_rating),
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Failed to load review summary.",
      });
    }
  }
);

// ============================================================
// PATCH /api/reviews/:id
// Admin only — approve/hide hospital review.
// ============================================================
router.patch(
  "/:id",
  verifyToken,
  requireRole("admin"),
  async (req, res) => {
    const {
      is_approved,
      is_hidden,
    } = req.body;

    try {
      const pool = await getPool();

      const result = await pool
        .request()
        .input(
          "id",
          sql.UniqueIdentifier,
          req.params.id
        )
        .input(
          "is_approved",
          sql.Bit,
          is_approved ? 1 : 0
        )
        .input(
          "is_hidden",
          sql.Bit,
          is_hidden ? 1 : 0
        )
        .query(`
          UPDATE reviews
          SET
            is_approved = @is_approved,
            is_hidden = @is_hidden
          OUTPUT
            INSERTED.id,
            INSERTED.patient_id,
            INSERTED.reviewer_name,
            INSERTED.rating,
            INSERTED.comment,
            INSERTED.is_verified_patient,
            INSERTED.is_approved,
            INSERTED.is_hidden,
            INSERTED.created_at
          WHERE id = @id
            AND doctor_id IS NULL
        `);

      if (!result.recordset[0]) {
        return res.status(404).json({
          error: "Hospital review not found.",
        });
      }

      res.json(result.recordset[0]);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Failed to update hospital review.",
      });
    }
  }
);

module.exports = router;