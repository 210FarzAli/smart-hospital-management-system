const express = require("express");
const { sql, getPool } = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// Require HR or Admin access for all HR routes
router.use(verifyToken, requireRole("hr", "admin"));

// ============================================================
// 1. GET /api/hr/dashboard
// Summary statistics for HR operations
// ============================================================
router.get("/dashboard", async (req, res) => {
  try {
    const pool = await getPool();

    // Total and active employees
    const empStats = await pool.request().query(`
      SELECT
        COUNT(*) AS total_employees,
        SUM(CASE WHEN employment_status = 'active' THEN 1 ELSE 0 END) AS active_employees,
        SUM(CASE WHEN employment_status = 'on_leave' THEN 1 ELSE 0 END) AS on_leave_employees,
        SUM(CASE WHEN employment_status = 'terminated' THEN 1 ELSE 0 END) AS terminated_employees
      FROM employees
    `);

    // Department breakdown
    const deptBreakdown = await pool.request().query(`
      SELECT
        d.id,
        d.name,
        COUNT(e.id) AS employee_count
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id AND e.employment_status = 'active'
      GROUP BY d.id, d.name
      ORDER BY employee_count DESC, d.name ASC
    `);

    // Current or latest month payroll metrics
    const payrollMetrics = await pool.request().query(`
      SELECT TOP 1
        period_month,
        period_year,
        COUNT(id) AS payroll_count,
        SUM(basic_salary) AS total_basic,
        SUM(allowances) AS total_allowances,
        SUM(net_salary) AS total_net_payout,
        SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) AS pending_count
      FROM payroll
      GROUP BY period_year, period_month
      ORDER BY period_year DESC, period_month DESC
    `);

    // Recent hires (last 5)
    const recentHires = await pool.request().query(`
      SELECT TOP 5
        e.id,
        e.full_name,
        e.designation,
        e.employment_status,
        e.joining_date,
        d.name AS department_name
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      ORDER BY e.created_at DESC
    `);

    res.json({
      stats: empStats.recordset[0] || {
        total_employees: 0,
        active_employees: 0,
        on_leave_employees: 0,
        terminated_employees: 0,
      },
      departmentBreakdown: deptBreakdown.recordset,
      latestPayroll: payrollMetrics.recordset[0] || null,
      recentHires: recentHires.recordset,
    });
  } catch (err) {
    console.error("Failed to load HR dashboard stats:", err);
    res.status(500).json({ error: "Failed to load HR dashboard metrics." });
  }
});

// ============================================================
// 2. GET /api/hr/employees
// List employees with filter and search
// ============================================================
router.get("/employees", async (req, res) => {
  const { search = "", department_id = "", status = "" } = req.query;

  try {
    const pool = await getPool();
    let query = `
      SELECT
        e.id,
        e.full_name,
        e.phone,
        e.email,
        e.department_id,
        d.name AS department_name,
        e.designation,
        e.joining_date,
        e.employment_status,
        e.qualification,
        e.emergency_contact,
        e.created_at,
        s.basic_salary,
        s.allowances,
        s.overtime_rate
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      OUTER APPLY (
        SELECT TOP 1 basic_salary, allowances, overtime_rate
        FROM salary_structures
        WHERE employee_id = e.id
        ORDER BY effective_from DESC, created_at DESC
      ) s
      WHERE 1=1
    `;

    if (status && status !== "all") {
      query += ` AND e.employment_status = '${status.replace(/'/g, "")}'`;
    }
    if (department_id && department_id !== "all") {
      query += ` AND e.department_id = '${department_id.replace(/'/g, "")}'`;
    }
    if (search && search.trim()) {
      const clean = search.trim().replace(/'/g, "");
      query += ` AND (
        e.full_name LIKE '%${clean}%'
        OR e.phone LIKE '%${clean}%'
        OR e.email LIKE '%${clean}%'
        OR e.designation LIKE '%${clean}%'
      )`;
    }

    query += ` ORDER BY e.full_name ASC`;

    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to fetch employees:", err);
    res.status(500).json({ error: "Failed to load employee directory." });
  }
});

// ============================================================
// 3. POST /api/hr/employees
// Create a new hospital employee
// ============================================================
router.post("/employees", async (req, res) => {
  const {
    full_name,
    phone,
    email,
    department_id,
    designation,
    joining_date,
    employment_status = "active",
    qualification,
    emergency_contact,
    basic_salary = 0,
    allowances = 0,
    overtime_rate = 0,
  } = req.body;

  if (!full_name || !phone || !email || !designation || !joining_date) {
    return res.status(400).json({
      error: "Full name, phone, email, designation, and joining date are required.",
    });
  }

  try {
    const pool = await getPool();

    const insertResult = await pool
      .request()
      .input("fn", sql.NVarChar, String(full_name).trim())
      .input("ph", sql.NVarChar, String(phone).trim())
      .input("em", sql.NVarChar, String(email).trim().toLowerCase())
      .input("did", sql.UniqueIdentifier, department_id || null)
      .input("desig", sql.NVarChar, String(designation).trim())
      .input("jd", sql.Date, joining_date)
      .input("status", sql.NVarChar, employment_status)
      .input("qual", sql.NVarChar, qualification ? String(qualification).trim() : null)
      .input("ec", sql.NVarChar, emergency_contact ? String(emergency_contact).trim() : null)
      .query(`
        INSERT INTO employees (
          full_name, phone, email, department_id, designation,
          joining_date, employment_status, qualification, emergency_contact
        )
        OUTPUT INSERTED.*
        VALUES (
          @fn, @ph, @em, @did, @desig, @jd, @status, @qual, @ec
        )
      `);

    const newEmployee = insertResult.recordset[0];

    // If salary was provided, create salary structure
    if (Number(basic_salary) > 0) {
      await pool
        .request()
        .input("eid", sql.UniqueIdentifier, newEmployee.id)
        .input("basic", sql.Decimal(12, 2), Number(basic_salary))
        .input("allow", sql.Decimal(12, 2), Number(allowances) || 0)
        .input("ot", sql.Decimal(10, 2), Number(overtime_rate) || 0)
        .input("ef", sql.Date, joining_date)
        .query(`
          INSERT INTO salary_structures (employee_id, basic_salary, allowances, overtime_rate, effective_from)
          VALUES (@eid, @basic, @allow, @ot, @ef)
        `);
    }

    res.status(201).json({
      employee: newEmployee,
      message: "Employee registered successfully.",
    });
  } catch (err) {
    console.error("Failed to register employee:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to create employee profile.",
    });
  }
});

// ============================================================
// 4. PUT /api/hr/employees/:id
// Update employee details
// ============================================================
router.put("/employees/:id", async (req, res) => {
  const { id } = req.params;
  const {
    full_name,
    phone,
    email,
    department_id,
    designation,
    employment_status,
    qualification,
    emergency_contact,
  } = req.body;

  try {
    const pool = await getPool();

    const updateResult = await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("fn", sql.NVarChar, full_name ? String(full_name).trim() : null)
      .input("ph", sql.NVarChar, phone ? String(phone).trim() : null)
      .input("em", sql.NVarChar, email ? String(email).trim().toLowerCase() : null)
      .input("did", sql.UniqueIdentifier, department_id || null)
      .input("desig", sql.NVarChar, designation ? String(designation).trim() : null)
      .input("status", sql.NVarChar, employment_status || "active")
      .input("qual", sql.NVarChar, qualification ? String(qualification).trim() : null)
      .input("ec", sql.NVarChar, emergency_contact ? String(emergency_contact).trim() : null)
      .query(`
        UPDATE employees
        SET
          full_name = COALESCE(@fn, full_name),
          phone = COALESCE(@ph, phone),
          email = COALESCE(@em, email),
          department_id = COALESCE(@did, department_id),
          designation = COALESCE(@desig, designation),
          employment_status = COALESCE(@status, employment_status),
          qualification = COALESCE(@qual, qualification),
          emergency_contact = COALESCE(@ec, emergency_contact)
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (updateResult.recordset.length === 0) {
      return res.status(404).json({ error: "Employee not found." });
    }

    res.json({
      employee: updateResult.recordset[0],
      message: "Employee profile updated successfully.",
    });
  } catch (err) {
    console.error("Failed to update employee:", err);
    res.status(500).json({ error: "Failed to update employee details." });
  }
});

// ============================================================
// 5. GET /api/hr/salary-structures
// View salary packages
// ============================================================
router.get("/salary-structures", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        s.id,
        s.employee_id,
        e.full_name AS employee_name,
        e.designation,
        d.name AS department_name,
        s.basic_salary,
        s.allowances,
        s.overtime_rate,
        s.effective_from,
        s.created_at
      FROM salary_structures s
      JOIN employees e ON e.id = s.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      ORDER BY e.full_name ASC, s.effective_from DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to load salary structures:", err);
    res.status(500).json({ error: "Failed to load salary structures." });
  }
});

// ============================================================
// 6. POST /api/hr/salary-structures
// Assign or update employee salary structure
// ============================================================
router.post("/salary-structures", async (req, res) => {
  const { employee_id, basic_salary, allowances = 0, overtime_rate = 0, effective_from } = req.body;

  if (!employee_id || basic_salary === undefined || basic_salary === null) {
    return res.status(400).json({ error: "Employee ID and basic salary are required." });
  }

  try {
    const pool = await getPool();
    const effDate = effective_from || new Date().toISOString().slice(0, 10);

    const result = await pool
      .request()
      .input("eid", sql.UniqueIdentifier, employee_id)
      .input("basic", sql.Decimal(12, 2), Number(basic_salary))
      .input("allow", sql.Decimal(12, 2), Number(allowances) || 0)
      .input("ot", sql.Decimal(10, 2), Number(overtime_rate) || 0)
      .input("ef", sql.Date, effDate)
      .query(`
        INSERT INTO salary_structures (employee_id, basic_salary, allowances, overtime_rate, effective_from)
        OUTPUT INSERTED.*
        VALUES (@eid, @basic, @allow, @ot, @ef)
      `);

    res.status(201).json({
      salaryStructure: result.recordset[0],
      message: "Salary structure recorded successfully.",
    });
  } catch (err) {
    console.error("Failed to set salary structure:", err);
    res.status(500).json({ error: "Failed to assign salary structure." });
  }
});

// ============================================================
// 7. GET /api/hr/payroll
// List monthly payroll records
// ============================================================
router.get("/payroll", async (req, res) => {
  const { month, year, status } = req.query;

  try {
    const pool = await getPool();
    let query = `
      SELECT
        p.id,
        p.employee_id,
        e.full_name AS employee_name,
        e.designation,
        d.name AS department_name,
        p.period_month,
        p.period_year,
        p.basic_salary,
        p.allowances,
        p.overtime,
        p.bonuses,
        p.deductions,
        p.net_salary,
        p.payment_status,
        p.paid_at,
        p.created_at
      FROM payroll p
      JOIN employees e ON e.id = p.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE 1=1
    `;

    if (month && month !== "all") {
      query += ` AND p.period_month = ${Number(month)}`;
    }
    if (year && year !== "all") {
      query += ` AND p.period_year = ${Number(year)}`;
    }
    if (status && status !== "all") {
      query += ` AND p.payment_status = '${status.replace(/'/g, "")}'`;
    }

    query += ` ORDER BY p.period_year DESC, p.period_month DESC, e.full_name ASC`;

    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to load payroll:", err);
    res.status(500).json({ error: "Failed to retrieve payroll history." });
  }
});

// ============================================================
// 8. POST /api/hr/payroll/generate
// Generate payroll run for active employees for month & year
// ============================================================
router.post("/payroll/generate", async (req, res) => {
  const { month, year } = req.body;
  const m = Number(month) || new Date().getMonth() + 1;
  const y = Number(year) || new Date().getFullYear();

  try {
    const pool = await getPool();

    // Get active employees with their current salary structure
    const empResult = await pool.request().query(`
      SELECT
        e.id,
        e.full_name,
        s.basic_salary,
        s.allowances
      FROM employees e
      CROSS APPLY (
        SELECT TOP 1 basic_salary, allowances
        FROM salary_structures
        WHERE employee_id = e.id
        ORDER BY effective_from DESC, created_at DESC
      ) s
      WHERE e.employment_status = 'active'
    `);

    const activeStaff = empResult.recordset;
    if (activeStaff.length === 0) {
      return res.status(400).json({
        error: "No active employees with assigned salary structures found.",
      });
    }

    let createdCount = 0;
    for (const staff of activeStaff) {
      // Check if payroll already exists for this employee, month, year
      const existing = await pool
        .request()
        .input("eid", sql.UniqueIdentifier, staff.id)
        .input("m", sql.Int, m)
        .input("y", sql.Int, y)
        .query(`
          SELECT id FROM payroll
          WHERE employee_id = @eid AND period_month = @m AND period_year = @y
        `);

      if (existing.recordset.length === 0) {
        // net_salary is a computed column, do not insert into it
        await pool
          .request()
          .input("eid", sql.UniqueIdentifier, staff.id)
          .input("m", sql.Int, m)
          .input("y", sql.Int, y)
          .input("basic", sql.Decimal(12, 2), staff.basic_salary)
          .input("allow", sql.Decimal(12, 2), staff.allowances || 0)
          .input("ot", sql.Decimal(12, 2), 0)
          .input("bonus", sql.Decimal(12, 2), 0)
          .input("ded", sql.Decimal(12, 2), 0)
          .query(`
            INSERT INTO payroll (
              employee_id, period_month, period_year,
              basic_salary, allowances, overtime, bonuses, deductions,
              payment_status
            )
            VALUES (
              @eid, @m, @y, @basic, @allow, @ot, @bonus, @ded, 'pending'
            )
          `);
        createdCount++;
      }
    }

    res.json({
      message: `Payroll run generated for ${m}/${y}. ${createdCount} new payroll pay slips created.`,
      generatedCount: createdCount,
    });
  } catch (err) {
    console.error("Failed to generate payroll:", err);
    res.status(500).json({ error: "Failed to generate monthly payroll." });
  }
});

// ============================================================
// 9. PUT /api/hr/payroll/:id/pay
// Mark payroll pay slip as paid
// ============================================================
router.put("/payroll/:id/pay", async (req, res) => {
  const { id } = req.params;
  const { payment_status = "paid" } = req.body;

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("status", sql.NVarChar, payment_status)
      .query(`
        UPDATE payroll
        SET
          payment_status = @status,
          paid_at = CASE WHEN @status = 'paid' THEN GETDATE() ELSE NULL END
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Payroll record not found." });
    }

    res.json({
      payroll: result.recordset[0],
      message: `Payroll marked as ${payment_status}.`,
    });
  } catch (err) {
    console.error("Failed to update payroll status:", err);
    res.status(500).json({ error: "Failed to update payroll record." });
  }
});

// ============================================================
// 10. GET /api/hr/attendance
// List attendance records by date or employee
// ============================================================
router.get("/attendance", async (req, res) => {
  const { date = new Date().toISOString().slice(0, 10), employee_id = "" } = req.query;

  try {
    const pool = await getPool();
    let query = `
      SELECT
        a.id,
        a.employee_id,
        a.attendance_date,
        a.status,
        a.check_in_time,
        a.check_out_time,
        a.remarks,
        e.full_name AS employee_name,
        e.phone AS employee_phone,
        e.designation,
        d.name AS department_name
      FROM employee_attendance a
      JOIN employees e ON e.id = a.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE 1=1
    `;

    const request = pool.request();
    if (date) {
      request.input("attDate", sql.Date, date);
      query += ` AND a.attendance_date = @attDate`;
    }
    if (employee_id) {
      request.input("empId", sql.UniqueIdentifier, employee_id);
      query += ` AND a.employee_id = @empId`;
    }

    query += ` ORDER BY e.full_name ASC`;
    const result = await request.query(query);

    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to fetch attendance:", err);
    res.status(500).json({ error: "Failed to fetch attendance records." });
  }
});

// ============================================================
// 11. POST /api/hr/attendance
// Mark or update attendance for an employee
// ============================================================
router.post("/attendance", async (req, res) => {
  const {
    employee_id,
    attendance_date = new Date().toISOString().slice(0, 10),
    status = "present",
    check_in_time = "09:00 AM",
    check_out_time = "05:00 PM",
    remarks = null,
  } = req.body;

  if (!employee_id) {
    return res.status(400).json({ error: "Employee is required." });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("empId", sql.UniqueIdentifier, employee_id)
      .input("attDate", sql.Date, attendance_date)
      .input("status", sql.NVarChar, status)
      .input("checkIn", sql.NVarChar, check_in_time || null)
      .input("checkOut", sql.NVarChar, check_out_time || null)
      .input("remarks", sql.NVarChar, remarks || null)
      .query(`
        MERGE employee_attendance AS target
        USING (SELECT @empId AS employee_id, @attDate AS attendance_date) AS source
        ON (target.employee_id = source.employee_id AND target.attendance_date = source.attendance_date)
        WHEN MATCHED THEN
          UPDATE SET
            status = @status,
            check_in_time = @checkIn,
            check_out_time = @checkOut,
            remarks = @remarks
        WHEN NOT MATCHED THEN
          INSERT (employee_id, attendance_date, status, check_in_time, check_out_time, remarks)
          VALUES (@empId, @attDate, @status, @checkIn, @checkOut, @remarks)
        OUTPUT INSERTED.*;
      `);

    res.json({
      attendance: result.recordset[0],
      message: "Attendance recorded successfully.",
    });
  } catch (err) {
    console.error("Failed to record attendance:", err);
    res.status(500).json({ error: "Failed to record attendance." });
  }
});

// ============================================================
// 12. GET /api/hr/leaves
// List employee leave requests
// ============================================================
router.get("/leaves", async (req, res) => {
  const { status = "", employee_id = "" } = req.query;

  try {
    const pool = await getPool();
    let query = `
      SELECT
        l.id,
        l.employee_id,
        l.leave_type,
        l.start_date,
        l.end_date,
        l.days_count,
        l.reason,
        l.status,
        l.created_at,
        e.full_name AS employee_name,
        e.phone AS employee_phone,
        e.designation,
        d.name AS department_name
      FROM employee_leaves l
      JOIN employees e ON e.id = l.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE 1=1
    `;

    const request = pool.request();
    if (status && status !== "all") {
      request.input("status", sql.NVarChar, status);
      query += ` AND l.status = @status`;
    }
    if (employee_id) {
      request.input("empId", sql.UniqueIdentifier, employee_id);
      query += ` AND l.employee_id = @empId`;
    }

    query += ` ORDER BY l.created_at DESC`;
    const result = await request.query(query);

    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to fetch leaves:", err);
    res.status(500).json({ error: "Failed to fetch leave requests." });
  }
});

// ============================================================
// 13. POST /api/hr/leaves
// Submit a leave request
// ============================================================
router.post("/leaves", async (req, res) => {
  const {
    employee_id,
    leave_type = "casual",
    start_date,
    end_date,
    days_count = 1,
    reason = "",
  } = req.body;

  if (!employee_id || !start_date || !end_date) {
    return res.status(400).json({ error: "Employee, start date, and end date are required." });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("empId", sql.UniqueIdentifier, employee_id)
      .input("leaveType", sql.NVarChar, leave_type)
      .input("startDate", sql.Date, start_date)
      .input("endDate", sql.Date, end_date)
      .input("daysCount", sql.Int, Number(days_count) || 1)
      .input("reason", sql.NVarChar, reason || null)
      .query(`
        INSERT INTO employee_leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status)
        OUTPUT INSERTED.*
        VALUES (@empId, @leaveType, @startDate, @endDate, @daysCount, @reason, 'pending');
      `);

    res.status(201).json({
      leave: result.recordset[0],
      message: "Leave application submitted successfully.",
    });
  } catch (err) {
    console.error("Failed to submit leave request:", err);
    res.status(500).json({ error: "Failed to submit leave request." });
  }
});

// ============================================================
// 14. PUT /api/hr/leaves/:id/status
// Approve or reject a leave request
// ============================================================
router.put("/leaves/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["approved", "rejected", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Status must be approved, rejected, or cancelled." });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("status", sql.NVarChar, status)
      .input("staffId", sql.UniqueIdentifier, req.user?.staffUserId || null)
      .query(`
        UPDATE employee_leaves
        SET status = @status, approved_by = @staffId
        OUTPUT INSERTED.*
        WHERE id = @id;
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Leave request not found." });
    }

    res.json({
      leave: result.recordset[0],
      message: `Leave request marked as ${status}.`,
    });
  } catch (err) {
    console.error("Failed to update leave status:", err);
    res.status(500).json({ error: "Failed to update leave status." });
  }
});

module.exports = router;
