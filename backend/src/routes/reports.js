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
      // Build date filters for all entities
      // --------------------------------------------------------
      let apptDateCondition = "";
      let createdAtCondition = "";
      let labDateCondition = "";

      if (period === "day") {
        apptDateCondition = "AND a.appointment_date = CAST(@reportDate AS DATE)";
        createdAtCondition = "AND CAST(created_at AS DATE) = CAST(@reportDate AS DATE)";
        labDateCondition = `
          AND (
            CAST(booking_date AS DATE) = CAST(@reportDate AS DATE)
            OR CAST(created_at AS DATE) = CAST(@reportDate AS DATE)
          )
        `;
      } else if (period === "week") {
        apptDateCondition = `
          AND a.appointment_date >= DATEADD(DAY, -((DATEDIFF(DAY, '19000101', CAST(@reportDate AS DATE)) % 7)), CAST(@reportDate AS DATE))
          AND a.appointment_date < DATEADD(DAY, 7, DATEADD(DAY, -((DATEDIFF(DAY, '19000101', CAST(@reportDate AS DATE)) % 7)), CAST(@reportDate AS DATE)))
        `;
        createdAtCondition = `
          AND created_at >= DATEADD(DAY, -((DATEDIFF(DAY, '19000101', CAST(@reportDate AS DATE)) % 7)), CAST(@reportDate AS DATE))
          AND created_at < DATEADD(DAY, 7, DATEADD(DAY, -((DATEDIFF(DAY, '19000101', CAST(@reportDate AS DATE)) % 7)), CAST(@reportDate AS DATE)))
        `;
        labDateCondition = `
          AND (
            (booking_date >= DATEADD(DAY, -((DATEDIFF(DAY, '19000101', CAST(@reportDate AS DATE)) % 7)), CAST(@reportDate AS DATE))
             AND booking_date < DATEADD(DAY, 7, DATEADD(DAY, -((DATEDIFF(DAY, '19000101', CAST(@reportDate AS DATE)) % 7)), CAST(@reportDate AS DATE))))
            OR
            (created_at >= DATEADD(DAY, -((DATEDIFF(DAY, '19000101', CAST(@reportDate AS DATE)) % 7)), CAST(@reportDate AS DATE))
             AND created_at < DATEADD(DAY, 7, DATEADD(DAY, -((DATEDIFF(DAY, '19000101', CAST(@reportDate AS DATE)) % 7)), CAST(@reportDate AS DATE))))
          )
        `;
      } else if (period === "month") {
        apptDateCondition = `
          AND a.appointment_date >= DATEFROMPARTS(YEAR(@reportDate), MONTH(@reportDate), 1)
          AND a.appointment_date < DATEADD(MONTH, 1, DATEFROMPARTS(YEAR(@reportDate), MONTH(@reportDate), 1))
        `;
        createdAtCondition = `
          AND created_at >= DATEFROMPARTS(YEAR(@reportDate), MONTH(@reportDate), 1)
          AND created_at < DATEADD(MONTH, 1, DATEFROMPARTS(YEAR(@reportDate), MONTH(@reportDate), 1))
        `;
        labDateCondition = `
          AND (
            (booking_date >= DATEFROMPARTS(YEAR(@reportDate), MONTH(@reportDate), 1)
             AND booking_date < DATEADD(MONTH, 1, DATEFROMPARTS(YEAR(@reportDate), MONTH(@reportDate), 1)))
            OR
            (created_at >= DATEFROMPARTS(YEAR(@reportDate), MONTH(@reportDate), 1)
             AND created_at < DATEADD(MONTH, 1, DATEFROMPARTS(YEAR(@reportDate), MONTH(@reportDate), 1)))
          )
        `;
      }

      // Shared request with parameter binding
      const filterRequest = () => {
        const req = pool.request();
        if (period !== "all") {
          req.input("reportDate", sql.Date, selectedDate || new Date().toISOString().slice(0, 10));
        }
        return req;
      };

      // --------------------------------------------------------
      // Load all report data with active date filtering
      // --------------------------------------------------------
      const [
        doctors,
        patients,
        consultations,
        pendingAppointments,
        confirmedAppointments,
        totalAppointments,
        physSales,
        onlineSales,
        reviews,
        labMetrics,
      ] = await Promise.all([
        // Doctors total
        pool.request().query("SELECT COUNT(*) AS count FROM doctors"),

        // Patient Inflow for the selected period
        filterRequest().query(`
          SELECT COUNT(*) AS count
          FROM patients
          WHERE 1 = 1 ${createdAtCondition}
        `),

        // Consultation Volume for the selected period (displayed on Consultation Volume KPI card)
        filterRequest().query(`
          SELECT COUNT(*) AS count
          FROM appointments a
          WHERE 1 = 1 ${apptDateCondition}
        `),

        // Pending appointments
        filterRequest().query(`
          SELECT COUNT(*) AS count
          FROM appointments a
          WHERE a.status = 'pending' ${apptDateCondition}
        `),

        // Confirmed appointments
        filterRequest().query(`
          SELECT COUNT(*) AS count
          FROM appointments a
          WHERE a.status = 'confirmed' ${apptDateCondition}
        `),

        // Total appointments overall
        pool.request().query("SELECT COUNT(*) AS count FROM appointments"),

        // Physical Pharmacy Sales
        filterRequest().query(`
          SELECT
            COUNT(*) AS count,
            ISNULL(SUM(total_amount), 0) AS revenue
          FROM pharmacy_sales
          WHERE 1 = 1 ${createdAtCondition}
        `),

        // Online Pharmacy Orders
        filterRequest().query(`
          SELECT
            COUNT(*) AS count,
            ISNULL(SUM(total_amount), 0) AS revenue
          FROM pharmacy_online_orders
          WHERE status != 'cancelled' ${createdAtCondition}
        `),

        // Reviews
        pool.request().query(`
          SELECT
            COUNT(*) AS count,
            ISNULL(AVG(CAST(rating AS FLOAT)), 0) AS avg_rating
          FROM reviews
        `),

        // Laboratory metrics for the selected period
        filterRequest().query(`
          SELECT
            (SELECT COUNT(*) FROM lab_bookings WHERE status != 'cancelled' ${labDateCondition}) AS total_bookings,
            (SELECT COUNT(*) FROM lab_booking_items WHERE result_status = 'completed' AND booking_id IN (SELECT id FROM lab_bookings WHERE status != 'cancelled' ${labDateCondition})) AS completed_tests,
            (SELECT ISNULL(SUM(total_amount), 0) FROM lab_bookings WHERE status != 'cancelled' ${labDateCondition}) AS revenue
        `),
      ]);

      const labStats = labMetrics?.recordset?.[0] || { total_bookings: 0, completed_tests: 0, revenue: 0 };
      const totalPharmacySalesCount =
        Number(physSales.recordset[0].count) + Number(onlineSales.recordset[0].count);
      const totalPharmacyRevenue =
        Number(physSales.recordset[0].revenue) + Number(onlineSales.recordset[0].revenue);

      // --------------------------------------------------------
      // Determine report period label
      // --------------------------------------------------------
      let periodLabel = "All Time";

      if (period === "day") {
        periodLabel = selectedDate ? selectedDate : "Today";
      }

      if (period === "week") {
        periodLabel = selectedDate ? `Week containing ${selectedDate}` : "This Week";
      }

      if (period === "month") {
        periodLabel = selectedDate ? selectedDate.substring(0, 7) : "This Month";
      }

      // --------------------------------------------------------
      // Response
      // --------------------------------------------------------
      res.json({
        doctors: doctors.recordset[0].count,
        patients: patients.recordset[0].count,
        appointmentsToday: consultations.recordset[0].count,
        pendingAppointments: pendingAppointments.recordset[0].count,
        confirmedAppointments: confirmedAppointments.recordset[0].count,
        totalAppointments: totalAppointments.recordset[0].count,

        // Pharmacy report (Combined physical counter sales + confirmed online orders)
        pharmacySales: totalPharmacySalesCount,
        pharmacyRevenue: totalPharmacyRevenue,

        // Laboratory report
        labBookings: Number(labStats.total_bookings || 0),
        labCompletedTests: Number(labStats.completed_tests || 0),
        labRevenue: Number(labStats.revenue || 0),

        // Selected report information
        reportPeriod: period,
        reportPeriodLabel: periodLabel,
        reportDate: selectedDate || null,

        // Reviews
        totalReviews: reviews.recordset[0].count,
        averageRating: reviews.recordset[0].avg_rating,
      });
    } catch (err) {
      console.error("Failed to load reports overview:", err);
      res.status(500).json({ error: "Failed to load report data." });
    }
  }
);

module.exports = router;