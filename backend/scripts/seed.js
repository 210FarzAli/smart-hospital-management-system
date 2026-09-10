// Seeds the local SQL Server database with demo data:
//   - departments, each with 10+ doctors
//   - sample medicines, patients, an appointment, and reviews
//   - one Admin login and one Doctor login (password hashed with bcrypt)
//
// Run with:  npm run seed   (after 01_schema.sql has been executed in SSMS)

require("dotenv").config();
const bcrypt = require("bcryptjs");
const { sql, getPool } = require("../src/db");

const DEPARTMENTS = [
  { name: "Cardiology", description: "Heart and cardiovascular care", services: ["ECG", "Angiography", "Cardiac Surgery"] },
  { name: "Pediatrics", description: "Child health and development", services: ["Vaccination", "Growth Monitoring", "Newborn Care"] },
  { name: "Orthopedics", description: "Bones, joints and muscles", services: ["Fracture Care", "Joint Replacement", "Physiotherapy"] },
  { name: "Dermatology", description: "Skin, hair and nail care", services: ["Skin Biopsy", "Laser Treatment", "Cosmetic Dermatology"] },
  { name: "Neurology", description: "Brain and nervous system", services: ["EEG", "Stroke Care", "Migraine Clinic"] },
  { name: "Gynecology", description: "Women's health and maternity care", services: ["Prenatal Care", "Ultrasound", "Family Planning"] },
];

const FIRST_NAMES = ["Ayesha", "Bilal", "Sana", "Usman", "Hina", "Ahmed", "Fatima", "Zain", "Mariam", "Hamza",
  "Sara", "Kashif", "Nida", "Farhan", "Rabia", "Imran", "Zara", "Adeel", "Amna", "Waqas"];
const LAST_NAMES = ["Khan", "Malik", "Siddiqui", "Raza", "Farooq", "Iqbal", "Sheikh", "Baig", "Chaudhry", "Abbasi"];
const QUALIFICATIONS = ["MBBS, FCPS", "MBBS, MD", "MBBS, FRCS", "MBBS, MRCP", "MBBS, DCH", "MBBS, MS"];

function shortCode(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

async function run() {
  const pool = await getPool();

  console.log("Seeding departments...");
  const departmentIds = {};
  for (const dept of DEPARTMENTS) {
    const existing = await pool.request().input("name", sql.NVarChar, dept.name)
      .query("SELECT id FROM departments WHERE name = @name");
    if (existing.recordset[0]) {
      departmentIds[dept.name] = existing.recordset[0].id;
      continue;
    }
    const result = await pool
      .request()
      .input("name", sql.NVarChar, dept.name)
      .input("description", sql.NVarChar, dept.description)
      .input("services", sql.NVarChar, dept.services.join(","))
      .query(`
        INSERT INTO departments (name, description, services)
        OUTPUT INSERTED.id VALUES (@name, @description, @services)
      `);
    departmentIds[dept.name] = result.recordset[0].id;
  }

  console.log("Seeding doctors (10 per department)...");
  for (const dept of DEPARTMENTS) {
    for (let i = 0; i < 10; i++) {
      const fullName = `Dr. ${FIRST_NAMES[(i * 7 + dept.name.length) % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3 + dept.name.length) % LAST_NAMES.length]}`;
      const availability = JSON.stringify([
        { day: "Mon", start_time: "09:00", end_time: "14:00" },
        { day: "Wed", start_time: "09:00", end_time: "14:00" },
        { day: "Fri", start_time: "15:00", end_time: "19:00" },
      ]);
      await pool
        .request()
        .input("department_id", sql.UniqueIdentifier, departmentIds[dept.name])
        .input("full_name", sql.NVarChar, fullName)
        .input("specialization", sql.NVarChar, `${dept.name} Specialist`)
        .input("qualification", sql.NVarChar, QUALIFICATIONS[i % QUALIFICATIONS.length])
        .input("experience_years", sql.Int, 3 + ((i * 2) % 20))
        .input("consultation_fee", sql.Decimal(10, 2), 1500 + i * 250)
        .input("availability", sql.NVarChar, availability)
        .input("description", sql.NVarChar, `Experienced ${dept.name} consultant focused on patient-centered care.`)
        .input("rating", sql.Decimal(2, 1), Math.round((3.5 + (i % 5) * 0.3) * 10) / 10)
        .query(`
          INSERT INTO doctors (department_id, full_name, specialization, qualification,
            experience_years, consultation_fee, availability, description, rating)
          VALUES (@department_id, @full_name, @specialization, @qualification,
            @experience_years, @consultation_fee, @availability, @description, @rating)
        `);
    }
  }

  console.log("Seeding medicines...");
  const medicines = [
    ["Paracetamol 500mg", "Analgesic", 5.0],
    ["Amoxicillin 250mg", "Antibiotic", 12.0],
    ["Cetirizine 10mg", "Antihistamine", 8.0],
    ["Omeprazole 20mg", "Antacid", 15.0],
    ["Metformin 500mg", "Antidiabetic", 10.0],
    ["Amlodipine 5mg", "Antihypertensive", 14.0],
  ];
  for (const [name, category, price] of medicines) {
    const existing = await pool.request().input("name", sql.NVarChar, name).query("SELECT id FROM medicines WHERE name = @name");
    let medicineId = existing.recordset[0]?.id;
    if (!medicineId) {
      const created = await pool
        .request()
        .input("name", sql.NVarChar, name)
        .input("category", sql.NVarChar, category)
        .input("unit_price", sql.Decimal(10, 2), price)
        .query("INSERT INTO medicines (name, category, unit_price) OUTPUT INSERTED.id VALUES (@name, @category, @unit_price)");
      medicineId = created.recordset[0].id;
    }
    await pool
      .request()
      .input("medicine_id", sql.UniqueIdentifier, medicineId)
      .input("batch_no", sql.NVarChar, shortCode("B"))
      .query(`
        INSERT INTO medicine_batches (medicine_id, batch_no, quantity, expiry_date)
        VALUES (@medicine_id, @batch_no, 200, DATEADD(YEAR, 1, GETDATE()))
      `);
  }

  console.log("Seeding a sample patient, appointment, and reviews...");
  const patientResult = await pool
    .request()
    .input("patient_code", sql.NVarChar, shortCode("P"))
    .input("full_name", sql.NVarChar, "Ali Raza")
    .input("phone", sql.NVarChar, "03001234567")
    .input("email", sql.NVarChar, "ali.raza@example.com")
    .query(`
      INSERT INTO patients (patient_code, full_name, phone, email)
      OUTPUT INSERTED.id VALUES (@patient_code, @full_name, @phone, @email)
    `);
  const patientId = patientResult.recordset[0].id;

  const firstDoctor = await pool.request().query("SELECT TOP 1 id FROM doctors ORDER BY created_at");
  const doctorId = firstDoctor.recordset[0].id;

  await pool
    .request()
    .input("appointment_code", sql.NVarChar, shortCode("A"))
    .input("patient_id", sql.UniqueIdentifier, patientId)
    .input("doctor_id", sql.UniqueIdentifier, doctorId)
    .query(`
      INSERT INTO appointments (appointment_code, patient_id, doctor_id, appointment_date, appointment_time, reason, status)
      VALUES (@appointment_code, @patient_id, @doctor_id, DATEADD(DAY, 2, CAST(GETDATE() AS DATE)), '10:30', 'Routine check-up', 'confirmed')
    `);

  await pool
    .request()
    .input("doctor_id", sql.UniqueIdentifier, doctorId)
    .query(`
      INSERT INTO reviews (doctor_id, reviewer_name, rating, comment, is_verified_patient)
      VALUES (@doctor_id, 'Ali Raza', 5, 'Very attentive and explained everything clearly.', 1)
    `);

  console.log("Creating Admin and Doctor login accounts...");
  const adminPassword = "Admin@123";
  const doctorPassword = "Doctor@123";
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const doctorHash = await bcrypt.hash(doctorPassword, 10);

  const adminExists = await pool.request().input("email", sql.NVarChar, "admin@hospital.local")
    .query("SELECT id FROM staff_users WHERE email = @email");
  if (!adminExists.recordset[0]) {
    await pool
      .request()
      .input("full_name", sql.NVarChar, "Hospital Admin")
      .input("email", sql.NVarChar, "admin@hospital.local")
      .input("password_hash", sql.NVarChar, adminHash)
      .query(`
        INSERT INTO staff_users (full_name, email, password_hash, role)
        VALUES (@full_name, @email, @password_hash, 'admin')
      `);
  }

  const doctorStaffExists = await pool.request().input("email", sql.NVarChar, "doctor@hospital.local")
    .query("SELECT id FROM staff_users WHERE email = @email");
  let doctorStaffId = doctorStaffExists.recordset[0]?.id;
  if (!doctorStaffId) {
    const created = await pool
      .request()
      .input("full_name", sql.NVarChar, "Dr. Ayesha Khan")
      .input("email", sql.NVarChar, "doctor@hospital.local")
      .input("password_hash", sql.NVarChar, doctorHash)
      .query(`
        INSERT INTO staff_users (full_name, email, password_hash, role)
        OUTPUT INSERTED.id
        VALUES (@full_name, @email, @password_hash, 'doctor')
      `);
    doctorStaffId = created.recordset[0].id;
  }
  // Link this login to the first seeded doctor row so /api/appointments/mine works immediately.
  await pool
    .request()
    .input("staff_user_id", sql.UniqueIdentifier, doctorStaffId)
    .input("doctor_id", sql.UniqueIdentifier, doctorId)
    .query("UPDATE doctors SET staff_user_id = @staff_user_id WHERE id = @doctor_id");

  console.log("\nSeed complete.");
  console.log("Admin login  -> email: admin@hospital.local   password:", adminPassword);
  console.log("Doctor login -> email: doctor@hospital.local  password:", doctorPassword);
  process.exit(0);
}

run().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
