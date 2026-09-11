const express = require("express");
const { sql, getPool } = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { sendReceiptEmail } = require("../utils/notify");

const router = express.Router();

function shortCode(prefix) {
  return `${prefix}-${Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase()}`;
}

// ============================================================
// GET /api/pharmacy/medicines
//
// Admin / Pharmacist
// Returns medicine inventory and current stock.
// Includes active / inactive status.
// ============================================================

router.get(
  "/medicines",
  verifyToken,
  requireRole("admin", "pharmacist", "doctor"),
  async (req, res) => {
    try {
      const pool = await getPool();

      const result = await pool.request().query(`
        SELECT
          m.*,
          ISNULL(SUM(b.quantity), 0) AS in_stock
        FROM medicines m
        LEFT JOIN medicine_batches b
          ON b.medicine_id = m.id
        GROUP BY
          m.id,
          m.name,
          m.category,
          m.unit_price,
          m.reorder_level,
          m.status,
          m.created_at
        ORDER BY m.name
      `);

      res.json(result.recordset);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Failed to load medicines.",
      });
    }
  }
);


// ============================================================
// POST /api/pharmacy/medicines
//
// Admin / Pharmacist
// Creates a new medicine and its initial stock batch.
// New medicines are active by default.
// ============================================================

router.post(
  "/medicines",
  verifyToken,
  requireRole("admin", "pharmacist"),
  async (req, res) => {
    const {
      name,
      category = null,
      unit_price,
      reorder_level = 20,
      batch_no,
      quantity = 0,
      purchase_date = null,
      expiry_date,
    } = req.body;

    if (
      !name ||
      unit_price === undefined ||
      !batch_no ||
      !expiry_date
    ) {
      return res.status(400).json({
        error:
          "Medicine name, unit price, batch number and expiry date are required.",
      });
    }

    if (Number(unit_price) < 0) {
      return res.status(400).json({
        error: "Unit price cannot be negative.",
      });
    }

    if (Number(reorder_level) < 0) {
      return res.status(400).json({
        error: "Reorder level cannot be negative.",
      });
    }

    if (Number(quantity) < 0) {
      return res.status(400).json({
        error: "Stock quantity cannot be negative.",
      });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // --------------------------------------------------------
      // Create medicine
      // --------------------------------------------------------

      const medicineResult =
        await new sql.Request(transaction)
          .input(
            "name",
            sql.NVarChar(150),
            String(name).trim()
          )
          .input(
            "category",
            sql.NVarChar(100),
            category
              ? String(category).trim()
              : null
          )
          .input(
            "unit_price",
            sql.Decimal(10, 2),
            Number(unit_price)
          )
          .input(
            "reorder_level",
            sql.Int,
            Number(reorder_level)
          )
          .query(`
            INSERT INTO medicines
            (
              name,
              category,
              unit_price,
              reorder_level
            )
            OUTPUT INSERTED.*
            VALUES
            (
              @name,
              @category,
              @unit_price,
              @reorder_level
            )
          `);

      const medicine =
        medicineResult.recordset[0];

      // --------------------------------------------------------
      // Create initial stock batch
      // --------------------------------------------------------

      const batchResult =
        await new sql.Request(transaction)
          .input(
            "medicine_id",
            sql.UniqueIdentifier,
            medicine.id
          )
          .input(
            "batch_no",
            sql.NVarChar(50),
            String(batch_no).trim()
          )
          .input(
            "quantity",
            sql.Int,
            Number(quantity)
          )
          .input(
            "purchase_date",
            sql.Date,
            purchase_date || null
          )
          .input(
            "expiry_date",
            sql.Date,
            expiry_date
          )
          .query(`
            INSERT INTO medicine_batches
            (
              medicine_id,
              batch_no,
              quantity,
              purchase_date,
              expiry_date
            )
            OUTPUT INSERTED.*
            VALUES
            (
              @medicine_id,
              @batch_no,
              @quantity,
              COALESCE(
                @purchase_date,
                CAST(GETDATE() AS DATE)
              ),
              @expiry_date
            )
          `);

      await transaction.commit();

      res.status(201).json({
        medicine,
        batch: batchResult.recordset[0],
      });
    } catch (err) {
      try {
        await transaction.rollback();
      } catch {}

      console.error(err);

      res.status(500).json({
        error: "Failed to add medicine.",
      });
    }
  }
);


// ============================================================
// PUT /api/pharmacy/medicines/:id
//
// Admin / Pharmacist
// Updates medicine information or active/inactive status.
// ============================================================

router.put(
  "/medicines/:id",
  verifyToken,
  requireRole("admin", "pharmacist"),
  async (req, res) => {
    const { id } = req.params;

    const allowedFields = [
      "name",
      "category",
      "unit_price",
      "reorder_level",
      "status",
    ];

    const updates = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(field);
      }
    }

    if (!updates.length) {
      return res.status(400).json({
        error:
          "No medicine fields were provided for update.",
      });
    }

    // --------------------------------------------------------
    // Validate unit price
    // --------------------------------------------------------

    if (
      req.body.unit_price !== undefined &&
      Number(req.body.unit_price) < 0
    ) {
      return res.status(400).json({
        error: "Unit price cannot be negative.",
      });
    }

    // --------------------------------------------------------
    // Validate reorder level
    // --------------------------------------------------------

    if (
      req.body.reorder_level !== undefined &&
      Number(req.body.reorder_level) < 0
    ) {
      return res.status(400).json({
        error:
          "Reorder level cannot be negative.",
      });
    }

    // --------------------------------------------------------
    // Validate medicine status
    // --------------------------------------------------------

    if (
      req.body.status !== undefined &&
      !["active", "inactive"].includes(
        String(req.body.status)
      )
    ) {
      return res.status(400).json({
        error: "Invalid medicine status.",
      });
    }

    try {
      const pool = await getPool();
      const request = pool.request();

      request.input(
        "id",
        sql.UniqueIdentifier,
        id
      );

      const setParts = [];

      for (const field of updates) {
        let type = sql.NVarChar;

        if (field === "unit_price") {
          type = sql.Decimal(10, 2);
        }

        if (field === "reorder_level") {
          type = sql.Int;
        }

        if (field === "status") {
          type = sql.NVarChar(20);
        }

        let value = req.body[field];

        if (
          field === "name" ||
          field === "category"
        ) {
          value =
            value === null
              ? null
              : String(value).trim();
        }

        if (field === "status") {
          value = String(value);
        }

        request.input(
          field,
          type,
          value
        );

        setParts.push(
          `${field} = @${field}`
        );
      }

      const result = await request.query(`
        UPDATE medicines
        SET ${setParts.join(", ")}
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

      if (!result.recordset[0]) {
        return res.status(404).json({
          error: "Medicine not found.",
        });
      }

      res.json(result.recordset[0]);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Failed to update medicine.",
      });
    }
  }
);


// ============================================================
// GET /api/pharmacy/customers
//
// Admin / Pharmacist
//
// Returns pharmacy customers together with:
// - total number of purchases
// - total amount spent
// - last purchase date
//
// This does not expose sensitive medical information.
// ============================================================

router.get(
  "/customers",
  verifyToken,
  requireRole("admin", "pharmacist"),
  async (req, res) => {
    try {
      const pool = await getPool();

      const result =
        await pool.request().query(`
          SELECT
            c.id,
            c.customer_code,
            c.full_name,
            c.phone,
            c.email,
            c.created_at,

            COUNT(s.id) AS purchase_count,

            ISNULL(
              SUM(s.total_amount),
              0
            ) AS total_spent,

            MAX(s.created_at)
              AS last_purchase_at

          FROM pharmacy_customers c

          LEFT JOIN pharmacy_sales s
            ON s.customer_id = c.id

          GROUP BY
            c.id,
            c.customer_code,
            c.full_name,
            c.phone,
            c.email,
            c.created_at

          ORDER BY
            c.full_name
        `);

      res.json(result.recordset);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Failed to load pharmacy customers.",
      });
    }
  }
);

// ============================================================
// GET /api/pharmacy/prescription-patients
//
// Admin / Pharmacist
//
// Returns active hospital patients who have a doctor-issued
// prescription, regardless of which doctor issued it.
//
// Also returns the medicines from the patient's latest
// prescription so the pharmacy POS can auto-fill them.
// ============================================================

router.get(
  "/prescription-patients",
  verifyToken,
  requireRole("admin", "pharmacist"),
  async (req, res) => {
    try {
      const pool = await getPool();

      const result = await pool.request().query(`
        WITH LatestPrescriptions AS (
          SELECT
            pr.id AS prescription_id,
            pr.patient_id,
            pr.doctor_id,
            pr.created_at AS prescription_date,

            ROW_NUMBER() OVER (
              PARTITION BY pr.patient_id
              ORDER BY pr.created_at DESC
            ) AS rn

          FROM prescriptions pr
        )

        SELECT
          p.id,
          p.patient_code,
          p.full_name,
          p.phone,
          p.email,

          lp.prescription_id,
          lp.prescription_date,

          d.id AS doctor_id,
          d.full_name AS doctor_name,
          d.specialization AS doctor_specialization,

          pd.id AS prescription_detail_id,
          pd.medicine_name,
          pd.quantity AS prescribed_quantity,
          pd.dosage,
          pd.duration,

          m.id AS medicine_id,
          m.name AS inventory_medicine_name,
          m.unit_price

        FROM LatestPrescriptions lp

        INNER JOIN patients p
          ON p.id = lp.patient_id

        INNER JOIN doctors d
          ON d.id = lp.doctor_id

        LEFT JOIN prescription_details pd
          ON pd.prescription_id = lp.prescription_id

        LEFT JOIN medicines m
  ON REPLACE(
       REPLACE(
         REPLACE(
           REPLACE(
             LOWER(LTRIM(RTRIM(m.name))),
             ' ',
             ''
           ),
           '-',
           ''
         ),
         '_',
         ''
       ),
       '.',
       ''
     )
     =
     REPLACE(
       REPLACE(
         REPLACE(
           REPLACE(
             LOWER(LTRIM(RTRIM(pd.medicine_name))),
             ' ',
             ''
           ),
           '-',
           ''
         ),
         '_',
         ''
       ),
       '.',
       ''
     )

        WHERE lp.rn = 1
          AND p.status = 'active'
          AND d.status = 'active'

        ORDER BY
          p.full_name,
          pd.id
      `);

      // Group prescription medicines under each patient.
      const patients = new Map();

      for (const row of result.recordset) {
        if (!patients.has(row.id)) {
          patients.set(row.id, {
            id: row.id,
            patient_code: row.patient_code,
            full_name: row.full_name,
            phone: row.phone,
            email: row.email,

            prescription_id: row.prescription_id,
            prescription_date: row.prescription_date,

            doctor_id: row.doctor_id,
            doctor_name: row.doctor_name,
            doctor_specialization:
              row.doctor_specialization,

            medicines: [],
          });
        }

        const patient = patients.get(row.id);

        if (row.prescription_detail_id) {
          patient.medicines.push({
            prescription_detail_id:
              row.prescription_detail_id,

            medicine_name:
              row.medicine_name,

            prescribed_quantity:
              row.prescribed_quantity,

            dosage:
              row.dosage,

            duration:
              row.duration,

            medicine_id:
              row.medicine_id,

            inventory_medicine_name:
              row.inventory_medicine_name,

            unit_price:
              row.unit_price,
          });
        }
      }

      res.json(Array.from(patients.values()));
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Failed to load prescription patients.",
      });
    }
  }
);

// ============================================================
// GET /api/pharmacy/sales
//
// Admin / Pharmacist
//
// Returns pharmacy sales history together with:
// - customer
// - pharmacist
// - receipt
// - email status
// ============================================================

router.get(
  "/sales",
  verifyToken,
  requireRole("admin", "pharmacist"),
  async (req, res) => {
    try {
      const pool = await getPool();

      const result =
        await pool.request().query(`
          SELECT
            s.id,
            s.sale_code,
            s.sale_type,
            s.total_amount,
            s.created_at,

            c.full_name AS customer_name,
            c.phone AS customer_phone,
            c.email AS customer_email,

            d.full_name AS referring_doctor,

            u.full_name AS sold_by,

            r.receipt_code,
            r.email_status,
            r.emailed_at

          FROM pharmacy_sales s

          LEFT JOIN pharmacy_customers c
            ON c.id = s.customer_id

            LEFT JOIN doctors d
            ON d.id = s.doctor_id

          LEFT JOIN staff_users u
            ON u.id = s.sold_by

          LEFT JOIN receipts r
            ON r.sale_id = s.id

          ORDER BY
            s.created_at DESC
        `);

      res.json(result.recordset);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Failed to load pharmacy sales.",
      });
    }
  }
);


// ============================================================
// POST /api/pharmacy/sales
//
// Admin / Pharmacist
//
// Records a pharmacy sale, creates/updates the pharmacy
// customer, deducts stock, creates a receipt and sends the
// receipt by email when an email address is available.
// ============================================================

router.post(
  "/sales",
  verifyToken,
  requireRole("admin", "pharmacist"),
  async (req, res) => {
    const {
      customer,
      patient_id = null,
      sale_type = "walk_in",
      items = [],
    } = req.body;

    if (!items.length) {
      return res.status(400).json({
        error:
          "At least one item is required.",
      });
    }

    const pool = await getPool();
    const transaction =
      new sql.Transaction(pool);

    try {
            await transaction.begin();

      // --------------------------------------------------------
      // Find referring doctor for prescription-based sales.
      // Walk-in sales do not have a referring doctor.
      // --------------------------------------------------------

      let doctorId = null;

      if (sale_type === "prescription") {
        if (!patient_id) {
          throw new Error(
            "Patient ID is required for a prescription sale."
          );
        }

        const prescriptionResult =
          await new sql.Request(transaction)
            .input(
              "patient_id",
              sql.UniqueIdentifier,
              patient_id
            )
            .query(`
              SELECT TOP 1
                doctor_id
              FROM prescriptions
              WHERE patient_id = @patient_id
              ORDER BY created_at DESC
            `);

        const prescription =
          prescriptionResult.recordset[0];

        if (!prescription) {
          throw new Error(
            "No hospital prescription was found for this patient."
          );
        }

        doctorId = prescription.doctor_id;
      }

      // --------------------------------------------------------
      // Find existing pharmacy customer or create a new one.
      // --------------------------------------------------------

      // --------------------------------------------------------
      // Calculate sale total.
      // --------------------------------------------------------

      const totalAmount = items.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity) *
            Number(item.unit_price),
        0
      );

      // --------------------------------------------------------
      // Create sale.
      // --------------------------------------------------------

      const saleResult =
        await new sql.Request(
          transaction
        )
          .input(
            "sale_code",
            sql.NVarChar,
            shortCode("S")
          )
          .input(
            "customer_id",
            sql.UniqueIdentifier,
            customerId
          )
          .input(
            "patient_id",
            sql.UniqueIdentifier,
            patient_id
          )

         .input(
            "doctor_id",
            sql.UniqueIdentifier,
            doctorId
          )
          .input(
            "sale_type",
            sql.NVarChar,
            sale_type
          )
          .input(
            "total_amount",
            sql.Decimal(12, 2),
            totalAmount
          )
          .input(
            "sold_by",
            sql.UniqueIdentifier,
            req.user.staffUserId
          )
          .query(`
            INSERT INTO pharmacy_sales
            (
              sale_code,
              customer_id,
              patient_id,
              doctor_id,
              sale_type,
              total_amount,
              sold_by
            )
            OUTPUT INSERTED.*
            VALUES
            (
              @sale_code,
              @customer_id,
              @patient_id,
              @doctor_id,
              @sale_type,
              @total_amount,
              @sold_by
            )
          `);

      const sale =
        saleResult.recordset[0];

      // --------------------------------------------------------
      // Save sale items and deduct stock.
      // --------------------------------------------------------

      const savedItems = [];

      for (const item of items) {
        // Check medicine status before selling.
        const medicineStatus =
          await new sql.Request(
            transaction
          )
            .input(
              "medicine_id",
              sql.UniqueIdentifier,
              item.medicine_id
            )
            .query(`
              SELECT
                id,
                name,
                status
              FROM medicines
              WHERE id = @medicine_id
            `);

        const medicine =
          medicineStatus.recordset[0];

        if (!medicine) {
          throw new Error(
            "Medicine not found."
          );
        }

        if (medicine.status !== "active") {
          throw new Error(
            `${medicine.name} is inactive and cannot be sold.`
          );
        }

        // ------------------------------------------------------
        // Save sale item.
        // ------------------------------------------------------

        await new sql.Request(
          transaction
        )
          .input(
            "sale_id",
            sql.UniqueIdentifier,
            sale.id
          )
          .input(
            "medicine_id",
            sql.UniqueIdentifier,
            item.medicine_id
          )
          .input(
            "quantity",
            sql.Int,
            item.quantity
          )
          .input(
            "unit_price",
            sql.Decimal(10, 2),
            item.unit_price
          )
          .query(`
            INSERT INTO medicine_issues
            (
              sale_id,
              medicine_id,
              quantity,
              unit_price
            )
            VALUES
            (
              @sale_id,
              @medicine_id,
              @quantity,
              @unit_price
            )
          `);

        // ------------------------------------------------------
        // Decrement the oldest available batch first.
        // ------------------------------------------------------

        const stockUpdate =
          await new sql.Request(
            transaction
          )
            .input(
              "medicine_id",
              sql.UniqueIdentifier,
              item.medicine_id
            )
            .input(
              "quantity",
              sql.Int,
              item.quantity
            )
            .query(`
              UPDATE TOP (1)
                medicine_batches
              SET
                quantity =
                  quantity - @quantity
              WHERE
                medicine_id = @medicine_id
                AND quantity >= @quantity
            `);

        if (
          stockUpdate.rowsAffected[0] === 0
        ) {
          throw new Error(
            `Insufficient stock for ${medicine.name}.`
          );
        }

        savedItems.push({
          medicine_name:
            medicine.name,
          quantity:
            item.quantity,
          unit_price:
            item.unit_price,
          line_total:
            item.quantity *
            item.unit_price,
        });
      }

      // --------------------------------------------------------
      // Create receipt.
      // --------------------------------------------------------

      const receiptCode =
        shortCode("R");

      await new sql.Request(
        transaction
      )
        .input(
          "sale_id",
          sql.UniqueIdentifier,
          sale.id
        )
        .input(
          "receipt_code",
          sql.NVarChar,
          receiptCode
        )
        .query(`
          INSERT INTO receipts
          (
            sale_id,
            receipt_code
          )
          VALUES
          (
            @sale_id,
            @receipt_code
          )
        `);

      await transaction.commit();

      // --------------------------------------------------------
      // Email receipt.
      // --------------------------------------------------------

      const emailResult =
        await sendReceiptEmail({
          customer,
          sale,
          items: savedItems,
          receiptCode,
        });

      const pool2 =
        await getPool();

      await pool2
        .request()
        .input(
          "sale_id",
          sql.UniqueIdentifier,
          sale.id
        )
        .input(
          "status",
          sql.NVarChar,
          emailResult.status
        )
        .query(`
          UPDATE receipts
          SET
            email_status = @status,
            emailed_at =
              CASE
                WHEN @status = 'sent'
                THEN SYSUTCDATETIME()
                ELSE NULL
              END
          WHERE sale_id = @sale_id
        `);

      res.status(201).json({
        sale,
        receiptCode,
        emailStatus:
          emailResult.status,
      });
    } catch (err) {
      try {
        await transaction.rollback();
      } catch {}

      console.error(err);

      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : "Failed to record sale.",
      });
    }
  }
);


module.exports = router;