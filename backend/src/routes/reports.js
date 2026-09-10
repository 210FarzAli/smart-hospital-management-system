const express = require("express");
const { getPool } = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// ============================================================
// GET /api/reports/overview
//
// Admin only.
//
// Optional query parameters:
//
// period:
//   all     = all-time report
//   day     = selected day
//   week    = week containing selected date
//   month   = month containing selected date
//
// date:
//   YYYY-MM-DD
//
// Examples:
//
// /api/reports/overview
// /api/reports/overview?period=day&date=2026-09-08
// /api/reports/overview?period=week&date=2026-09-08
// /api/reports/overview?period=month&date=2026-09-08
// ============================================================
router.get(
  "/overview",
  verifyToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const pool = await getPool();

      const period =
        typeof req.query.period === "string"
          ? req.query.period
          : "all";

      const selectedDate =
        typeof req.query.date === "string"
          ? req.query.date
          : null;

      // --------------------------------------------------------
      // Validate period
      // --------------------------------------------------------
      const allowedPeriods = [
        "all",
        "day",
        "week",
        "month",
      ];

      if (!allowedPeriods.includes(period)) {
        return res.status(400).json({
          error:
            "Invalid report period. Use all, day, week or month.",
        });
      }

      // --------------------------------------------------------
      // Validate selected date
      // --------------------------------------------------------
      let reportDate = new Date();

      if (selectedDate) {
        // Require YYYY-MM-DD
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(
            selectedDate
          )
        ) {
          return res.status(400).json({
            error:
              "Invalid date. Use YYYY-MM-DD.",
          });
        }

        const parsedDate = new Date(
          `${selectedDate}T00:00:00`
        );

        if (Number.isNaN(parsedDate.getTime())) {
          return res.status(400).json({
            error: "Invalid report date.",
          });
        }

        reportDate = parsedDate;
      }

      // --------------------------------------------------------
      // Build pharmacy date filter
      // --------------------------------------------------------
      let pharmacyDateCondition = "";

      if (period === "day") {
        pharmacyDateCondition = `
          AND CAST(created_at AS DATE) =
            CAST(@reportDate AS DATE)
        `;
      }

      if (period === "week") {
        pharmacyDateCondition = `
          AND created_at >=
            DATEADD(
              DAY,
              -(
                (
                  DATEDIFF(
                    DAY,
                    '19000101',
                    CAST(@reportDate AS DATE)
                  ) % 7
                )
              ),
              CAST(@reportDate AS DATE)
            )
          AND created_at <
            DATEADD(
              DAY,
              7,
              DATEADD(
                DAY,
                -(
                  (
                    DATEDIFF(
                      DAY,
                      '19000101',
                      CAST(@reportDate AS DATE)
                    ) % 7
                  )
                ),
                CAST(@reportDate AS DATE)
              )
            )
        `;
      }

      if (period === "month") {
        pharmacyDateCondition = `
          AND created_at >=
            DATEFROMPARTS(
              YEAR(@reportDate),
              MONTH(@reportDate),
              1
            )
          AND created_at <
            DATEADD(
              MONTH,
              1,
              DATEFROMPARTS(
                YEAR(@reportDate),
                MONTH(@reportDate),
                1
              )
            )
        `;
      }

      // --------------------------------------------------------
      // Build pharmacy request
      // --------------------------------------------------------
      const pharmacyRequest = pool.request();

      if (period !== "all") {
        pharmacyRequest.input(
          "reportDate",
          selectedDate
            ? selectedDate
            : new Date()
        );
      }

      // --------------------------------------------------------
      // Load all report data
      // --------------------------------------------------------
      const [
        doctors,
        patients,
        appointmentsToday,
        pendingAppointments,
        pharmacySales,
        reviews,
      ] = await Promise.all([
        // ------------------------------------------------------
        // Doctors
        // ------------------------------------------------------
        pool.request().query(`
          SELECT COUNT(*) AS count
          FROM doctors
        `),

        // ------------------------------------------------------
        // Patients
        // ------------------------------------------------------
        pool.request().query(`
          SELECT COUNT(*) AS count
          FROM patients
        `),

        // ------------------------------------------------------
        // Today's appointments
        // ------------------------------------------------------
        pool.request().query(`
          SELECT COUNT(*) AS count
          FROM appointments
          WHERE appointment_date =
            CAST(GETDATE() AS DATE)
        `),

        // ------------------------------------------------------
        // Pending appointments
        // ------------------------------------------------------
        pool.request().query(`
          SELECT COUNT(*) AS count
          FROM appointments
          WHERE status = 'pending'
        `),

        // ------------------------------------------------------
        // Pharmacy report
        // ------------------------------------------------------
        pharmacyRequest.query(`
          SELECT
            COUNT(*) AS count,
            ISNULL(
              SUM(total_amount),
              0
            ) AS revenue
          FROM pharmacy_sales
          WHERE 1 = 1
          ${pharmacyDateCondition}
        `),

        // ------------------------------------------------------
        // Reviews
        // ------------------------------------------------------
        pool.request().query(`
          SELECT
            COUNT(*) AS count,
            ISNULL(
              AVG(
                CAST(rating AS FLOAT)
              ),
              0
            ) AS avg_rating
          FROM reviews
        `),
      ]);

      // --------------------------------------------------------
      // Determine report period label
      // --------------------------------------------------------
      let periodLabel = "All Time";

      if (period === "day") {
        periodLabel = selectedDate
          ? selectedDate
          : "Today";
      }

      if (period === "week") {
        periodLabel = selectedDate
          ? `Week containing ${selectedDate}`
          : "This Week";
      }

      if (period === "month") {
        periodLabel = selectedDate
          ? selectedDate.substring(0, 7)
          : "This Month";
      }

      // --------------------------------------------------------
      // Response
      // --------------------------------------------------------
      res.json({
        doctors:
          doctors.recordset[0].count,

        patients:
          patients.recordset[0].count,

        appointmentsToday:
          appointmentsToday.recordset[0].count,

        pendingAppointments:
          pendingAppointments.recordset[0].count,

        // Pharmacy report
        pharmacySales:
          pharmacySales.recordset[0].count,

        pharmacyRevenue:
          pharmacySales.recordset[0].revenue,

        // Selected report information
        reportPeriod: period,

        reportPeriodLabel: periodLabel,

        reportDate:
          selectedDate || null,

        // Reviews
        totalReviews:
          reviews.recordset[0].count,

        averageRating:
          reviews.recordset[0].avg_rating,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Failed to load report data.",
      });
    }
  }
);

module.exports = router;