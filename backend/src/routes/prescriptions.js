const express = require("express");
const { sql, getPool } = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

/*
============================================================
POST /api/prescriptions

Doctor only.

Records:
- Consultation notes
- Prescription medicines

Then marks the appointment as completed.
============================================================
*/

router.post("/", verifyToken, requireRole("doctor"), async (req, res) => {
  const {
    appointment_id,
    patient_id,
    consultation_notes = "",
    medicines = [],
  } = req.body;

  if (!appointment_id || !patient_id) {
    return res.status(400).json({
      error: "appointment_id and patient_id are required.",
    });
  }

  if (!req.user.doctorId) {
    return res.status(400).json({
      error: "No doctor profile linked to this account.",
    });
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    /*
    ------------------------------------------------------------
    Verify that this appointment belongs to the logged-in doctor
    and that the supplied patient matches the appointment.
    ------------------------------------------------------------
    */

    const appointmentResult = await new sql.Request(transaction)
      .input(
        "appointment_id",
        sql.UniqueIdentifier,
        appointment_id
      )
      .query(`
        SELECT
          id,
          patient_id,
          doctor_id,
          status
        FROM appointments
        WHERE id = @appointment_id
      `);

    const appointment = appointmentResult.recordset[0];

    if (!appointment) {
      await transaction.rollback();

      return res.status(404).json({
        error: "Appointment not found.",
      });
    }

    if (appointment.doctor_id !== req.user.doctorId) {
      await transaction.rollback();

      return res.status(403).json({
        error: "You can only complete your own appointments.",
      });
    }

    if (appointment.patient_id !== patient_id) {
      await transaction.rollback();

      return res.status(400).json({
        error: "Patient does not match this appointment.",
      });
    }

    /*
    ------------------------------------------------------------
    Do not create another consultation if this appointment
    has already been completed.
    ------------------------------------------------------------
    */

    if (appointment.status === "completed") {
      await transaction.rollback();

      return res.status(409).json({
        error: "This appointment has already been completed.",
      });
    }

    /*
    ------------------------------------------------------------
    Check whether a prescription already exists.
    ------------------------------------------------------------
    */

    const existingPrescriptionResult =
      await new sql.Request(transaction)
        .input(
          "appointment_id",
          sql.UniqueIdentifier,
          appointment_id
        )
        .query(`
          SELECT TOP 1 id
          FROM prescriptions
          WHERE appointment_id = @appointment_id
        `);

    if (existingPrescriptionResult.recordset[0]) {
      await transaction.rollback();

      return res.status(409).json({
        error: "A consultation has already been recorded for this appointment.",
      });
    }

    /*
    ------------------------------------------------------------
    Create consultation / prescription record
    ------------------------------------------------------------
    */

    const prescriptionResult =
      await new sql.Request(transaction)
        .input(
          "appointment_id",
          sql.UniqueIdentifier,
          appointment_id
        )
        .input(
          "patient_id",
          sql.UniqueIdentifier,
          patient_id
        )
        .input(
          "doctor_id",
          sql.UniqueIdentifier,
          req.user.doctorId
        )
        .input(
          "consultation_notes",
          sql.NVarChar,
          consultation_notes
        )
        .query(`
          INSERT INTO prescriptions
          (
            appointment_id,
            patient_id,
            doctor_id,
            consultation_notes
          )
          OUTPUT INSERTED.*
          VALUES
          (
            @appointment_id,
            @patient_id,
            @doctor_id,
            @consultation_notes
          )
        `);

    const prescription = prescriptionResult.recordset[0];

    /*
    ------------------------------------------------------------
    Save prescribed medicines
    ------------------------------------------------------------
    */

    for (const medicine of medicines.filter(
  (m) => m.medicine_name?.trim()
)) {
  let medicineId = medicine.medicine_id || null;

  // If a pharmacy medicine ID was supplied,
  // verify that the medicine actually exists.
  if (medicineId) {
    const medicineResult =
      await new sql.Request(transaction)
        .input(
          "medicine_id",
          sql.UniqueIdentifier,
          medicineId
        )
        .query(`
          SELECT id, name, status
          FROM medicines
          WHERE id = @medicine_id
        `);

    const pharmacyMedicine =
      medicineResult.recordset[0];

    if (!pharmacyMedicine) {
      throw new Error(
        "Selected pharmacy medicine was not found."
      );
    }

    if (pharmacyMedicine.status === "inactive") {
      throw new Error(
        `${pharmacyMedicine.name} is inactive and cannot be prescribed.`
      );
    }
  }

  await new sql.Request(transaction)
    .input(
      "prescription_id",
      sql.UniqueIdentifier,
      prescription.id
    )
    .input(
      "medicine_id",
      sql.UniqueIdentifier,
      medicineId
    )
    .input(
      "medicine_name",
      sql.NVarChar,
      medicine.medicine_name.trim()
    )
    .input(
      "quantity",
      sql.NVarChar,
      medicine.quantity || null
    )
    .input(
      "dosage",
      sql.NVarChar,
      medicine.dosage || null
    )
    .input(
      "duration",
      sql.NVarChar,
      medicine.duration || null
    )
    .query(`
      INSERT INTO prescription_details
      (
        prescription_id,
        medicine_id,
        medicine_name,
        quantity,
        dosage,
        duration
      )
      VALUES
      (
        @prescription_id,
        @medicine_id,
        @medicine_name,
        @quantity,
        @dosage,
        @duration
      )
    `);
}

    /*
    ------------------------------------------------------------
    Mark appointment completed
    ------------------------------------------------------------
    */

    await new sql.Request(transaction)
      .input(
        "appointment_id",
        sql.UniqueIdentifier,
        appointment_id
      )
      .query(`
        UPDATE appointments
        SET status = 'completed'
        WHERE id = @appointment_id
      `);

    await transaction.commit();

    return res.status(201).json({
      prescription,
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {
      // Ignore rollback errors.
    }

    console.error(err);

    return res.status(500).json({
      error: "Failed to save consultation.",
    });
  }
});


/*
============================================================
GET /api/prescriptions/appointment/:appointmentId

Admin:
- Can view any consultation.

Doctor:
- Can only view their own patient's consultation.

Returns:
- Consultation notes
- Prescription medicines
============================================================
*/

router.get(
  "/appointment/:appointmentId",
  verifyToken,
  async (req, res) => {
    try {
      const pool = await getPool();

      /*
      ----------------------------------------------------------
      Get prescription + appointment ownership information
      ----------------------------------------------------------
      */

      const prescriptionResult = await pool
        .request()
        .input(
          "appointmentId",
          sql.UniqueIdentifier,
          req.params.appointmentId
        )
        .query(`
          SELECT
            pr.*,
            a.status AS appointment_status,
            a.appointment_date,
            a.appointment_time
          FROM prescriptions pr
          INNER JOIN appointments a
            ON a.id = pr.appointment_id
          WHERE pr.appointment_id = @appointmentId
        `);

      const prescription =
        prescriptionResult.recordset[0];

      if (!prescription) {
        return res.status(404).json({
          error: "No prescription for this appointment.",
        });
      }

      /*
      ----------------------------------------------------------
      Doctor can only access their own consultation
      ----------------------------------------------------------
      */

      if (
        req.user.role === "doctor" &&
        prescription.doctor_id !== req.user.doctorId
      ) {
        return res.status(403).json({
          error: "You can only view your own consultations.",
        });
      }

      /*
      ----------------------------------------------------------
      Only admin and doctor are allowed here.
      ----------------------------------------------------------
      */

      if (!["admin", "doctor"].includes(req.user.role)) {
        return res.status(403).json({
          error: "Not authorized to view this consultation.",
        });
      }

      /*
      ----------------------------------------------------------
      Get prescription medicines
      ----------------------------------------------------------
      */

      const detailsResult = await pool
        .request()
        .input(
          "prescriptionId",
          sql.UniqueIdentifier,
          prescription.id
        )
        .query(`
          SELECT
            id,
            prescription_id,
            medicine_name,
            quantity,
            dosage,
            duration
          FROM prescription_details
          WHERE prescription_id = @prescriptionId
          ORDER BY id
        `);

      /*
      ----------------------------------------------------------
      Return complete consultation
      ----------------------------------------------------------
      */

      return res.json({
        ...prescription,
        details: detailsResult.recordset,
      });
    } catch (err) {
      console.error(err);

      return res.status(500).json({
        error: "Failed to load prescription.",
      });
    }
  }
);


module.exports = router;