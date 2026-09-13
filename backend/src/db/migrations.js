const { sql, getPool } = require("../db");

function shortCode(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function ensureMigrations() {
  try {
    const pool = await getPool();

    // 1. lab_tests
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lab_tests')
      BEGIN
        CREATE TABLE lab_tests (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          test_code NVARCHAR(20) NOT NULL UNIQUE,
          name NVARCHAR(150) NOT NULL,
          category NVARCHAR(100) NOT NULL,
          description NVARCHAR(500) NULL,
          price DECIMAL(10,2) NOT NULL DEFAULT 0,
          sample_type NVARCHAR(50) NOT NULL DEFAULT 'Blood',
          normal_range NVARCHAR(200) NULL,
          unit NVARCHAR(50) NULL,
          turnaround_hours INT NOT NULL DEFAULT 24,
          is_home_collection_available BIT NOT NULL DEFAULT 1,
          status NVARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
          created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );
      END
    `);

    // Ensure is_home_collection_available column exists if table was created previously
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID('lab_tests') AND name = 'is_home_collection_available'
      )
      BEGIN
        ALTER TABLE lab_tests ADD is_home_collection_available BIT NOT NULL DEFAULT 1;
      END
    `);

    // 2. lab_bookings
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lab_bookings')
      BEGIN
        CREATE TABLE lab_bookings (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          booking_code NVARCHAR(30) NOT NULL UNIQUE,
          tracking_id NVARCHAR(30) NOT NULL UNIQUE,
          patient_name NVARCHAR(150) NOT NULL,
          patient_phone NVARCHAR(30) NOT NULL,
          patient_email NVARCHAR(150) NULL,
          patient_age INT NULL,
          patient_gender NVARCHAR(20) NULL,
          service_type NVARCHAR(30) NOT NULL CHECK (service_type IN ('in_clinic', 'home_service')),
          booking_date DATE NOT NULL,
          booking_time NVARCHAR(20) NULL,
          home_address NVARCHAR(500) NULL,
          notes NVARCHAR(1000) NULL,
          status NVARCHAR(30) NOT NULL DEFAULT 'booked',
          total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
          registered_by UNIQUEIDENTIFIER NULL REFERENCES staff_users(id) ON DELETE SET NULL,
          created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );

        CREATE INDEX idx_lab_bookings_tracking ON lab_bookings(tracking_id);
        CREATE INDEX idx_lab_bookings_date ON lab_bookings(booking_date);
      END
    `);

    // Update status check constraint on lab_bookings to support full workflow
    await pool.request().query(`
      IF EXISTS (
        SELECT * FROM sys.check_constraints 
        WHERE parent_object_id = OBJECT_ID('lab_bookings') AND name LIKE '%status%'
      )
      BEGIN
        DECLARE @chkName NVARCHAR(128);
        SELECT TOP 1 @chkName = name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('lab_bookings') AND name LIKE '%status%';
        EXEC('ALTER TABLE lab_bookings DROP CONSTRAINT ' + @chkName);
      END
      ALTER TABLE lab_bookings ADD CONSTRAINT CK_lab_bookings_status CHECK (
        status IN (
          'booked',
          'sample_collection_pending',
          'sample_collected',
          'processing',
          'result_ready',
          'completed',
          'cancelled',
          'pending',
          'confirmed',
          'in_progress'
        )
      );

      -- Migrate legacy 'booked' and 'sample_collection_pending' records to 'pending' to align with Laboratory staff workflow
      UPDATE lab_bookings
      SET status = 'pending'
      WHERE status IN ('booked', 'sample_collection_pending');

      -- Update default constraint on status to 'pending'
      DECLARE @dfName NVARCHAR(128);
      SELECT @dfName = d.name
      FROM sys.default_constraints d
      JOIN sys.columns c ON d.parent_object_id = c.object_id AND d.parent_column_id = c.column_id
      WHERE d.parent_object_id = OBJECT_ID('lab_bookings') AND c.name = 'status';
      IF @dfName IS NOT NULL
        EXEC('ALTER TABLE lab_bookings DROP CONSTRAINT ' + @dfName);
      ALTER TABLE lab_bookings ADD CONSTRAINT DF_lab_bookings_status DEFAULT 'pending' FOR status;
    `);

    // 3. lab_booking_items
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lab_booking_items')
      BEGIN
        CREATE TABLE lab_booking_items (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          booking_id UNIQUEIDENTIFIER NOT NULL REFERENCES lab_bookings(id) ON DELETE CASCADE,
          test_id UNIQUEIDENTIFIER NULL REFERENCES lab_tests(id) ON DELETE SET NULL,
          test_name NVARCHAR(150) NOT NULL,
          price DECIMAL(10,2) NOT NULL DEFAULT 0,
          result_value NVARCHAR(200) NULL,
          result_status NVARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (result_status IN ('pending', 'in_progress', 'completed')),
          normal_range NVARCHAR(200) NULL,
          unit NVARCHAR(50) NULL,
          remarks NVARCHAR(500) NULL,
          completed_at DATETIME2 NULL
        );

        CREATE INDEX idx_lab_booking_items_booking ON lab_booking_items(booking_id);
      END
    `);

    // 4. pharmacy_online_orders
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'pharmacy_online_orders')
      BEGIN
        CREATE TABLE pharmacy_online_orders (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          order_code NVARCHAR(30) NOT NULL UNIQUE,
          customer_name NVARCHAR(150) NOT NULL,
          customer_phone NVARCHAR(30) NOT NULL,
          customer_email NVARCHAR(150) NULL,
          delivery_address NVARCHAR(500) NOT NULL,
          notes NVARCHAR(500) NULL,
          total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
          status NVARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'ready', 'completed', 'cancelled')),
          created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );

        CREATE INDEX idx_pharmacy_online_orders_code ON pharmacy_online_orders(order_code);
        CREATE INDEX idx_pharmacy_online_orders_status ON pharmacy_online_orders(status);
      END
    `);

    // 5. pharmacy_online_order_items
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'pharmacy_online_order_items')
      BEGIN
        CREATE TABLE pharmacy_online_order_items (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          order_id UNIQUEIDENTIFIER NOT NULL REFERENCES pharmacy_online_orders(id) ON DELETE CASCADE,
          medicine_id UNIQUEIDENTIFIER NOT NULL REFERENCES medicines(id),
          medicine_name NVARCHAR(150) NOT NULL,
          quantity INT NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          line_total DECIMAL(12,2) NOT NULL
        );

        CREATE INDEX idx_online_order_items_order ON pharmacy_online_order_items(order_id);
      END
    `);

    // 6. Populate standard laboratory tests catalog (idempotent, by test_code)
    const realisticLabTests = [
      // Hematology
      {
        code: "LT-CBC",
        name: "Complete Blood Count (CBC)",
        category: "Hematology",
        description: "Evaluates cellular components: red blood cells, white blood cells, platelets, and hemoglobin index.",
        price: 850,
        sample: "Blood (EDTA)",
        range: "WBC: 4.5-11.0 x10^3/uL, Platelets: 150-450 x10^3/uL",
        unit: "x10^3/uL",
        hours: 12,
        home: 1,
      },
      {
        code: "LT-ESR",
        name: "Erythrocyte Sedimentation Rate (ESR)",
        category: "Hematology",
        description: "Non-specific diagnostic biomarker of systemic inflammation, infection, or autoimmune disorders.",
        price: 350,
        sample: "Blood (Sodium Citrate)",
        range: "0 - 20 mm/hr",
        unit: "mm/hr",
        hours: 6,
        home: 1,
      },
      {
        code: "LT-BGRH",
        name: "Blood Grouping & Rh Factor",
        category: "Hematology",
        description: "Identifies ABO blood type and Rh D surface antigen presence for transfusions and pregnancy.",
        price: 450,
        sample: "Blood (EDTA)",
        range: "ABO / Rh Type",
        unit: "",
        hours: 4,
        home: 1,
      },
      {
        code: "LT-PSMEAR",
        name: "Peripheral Blood Smear Examination",
        category: "Hematology",
        description: "Microscopic evaluation of red and white blood cell morphology for anemia, malaria, and leukemia.",
        price: 650,
        sample: "Blood (EDTA Slide)",
        range: "Normal morphology",
        unit: "",
        hours: 12,
        home: 1,
      },

      // Biochemistry
      {
        code: "LT-LIPID",
        name: "Lipid Profile Panel",
        category: "Biochemistry",
        description: "Assesses cardiovascular risk via Total Cholesterol, Triglycerides, HDL, LDL, and VLDL.",
        price: 1800,
        sample: "Blood (Serum)",
        range: "Cholesterol < 200 mg/dL, HDL > 40 mg/dL",
        unit: "mg/dL",
        hours: 24,
        home: 1,
      },
      {
        code: "LT-LFT",
        name: "Liver Function Test (LFT)",
        category: "Biochemistry",
        description: "Comprehensive hepatic panel: Total/Direct Bilirubin, ALT (SGPT), AST (SGOT), Alkaline Phosphatase, and Protein.",
        price: 1650,
        sample: "Blood (Serum)",
        range: "ALT: 7-56 U/L, AST: 10-40 U/L, Total Bili: 0.2-1.2 mg/dL",
        unit: "U/L",
        hours: 24,
        home: 1,
      },
      {
        code: "LT-RFT",
        name: "Renal Function Test (RFT / KFT)",
        category: "Biochemistry",
        description: "Assesses glomerular filtration, kidney health, and waste clearance via Serum Creatinine and Blood Urea Nitrogen.",
        price: 1500,
        sample: "Blood (Serum)",
        range: "Creatinine: 0.7 - 1.3 mg/dL, Urea: 15 - 45 mg/dL",
        unit: "mg/dL",
        hours: 24,
        home: 1,
      },
      {
        code: "LT-ELECT",
        name: "Serum Electrolytes (Na, K, Cl)",
        category: "Biochemistry",
        description: "Vital electrolyte panel measuring sodium, potassium, and chloride for metabolic and fluid balance.",
        price: 1100,
        sample: "Blood (Serum)",
        range: "Na: 135-145 mEq/L, K: 3.5-5.0 mEq/L, Cl: 96-106 mEq/L",
        unit: "mEq/L",
        hours: 12,
        home: 1,
      },
      {
        code: "LT-URIC",
        name: "Serum Uric Acid",
        category: "Biochemistry",
        description: "Diagnostics for gouty arthritis, kidney stones, and hyperuricemia assessment.",
        price: 550,
        sample: "Blood (Serum)",
        range: "3.5 - 7.2 mg/dL",
        unit: "mg/dL",
        hours: 12,
        home: 1,
      },
      {
        code: "LT-VITD",
        name: "Vitamin D (25-Hydroxy)",
        category: "Biochemistry",
        description: "Essential endocrine marker for calcium absorption, bone density, osteoporosis, and immune health.",
        price: 3200,
        sample: "Blood (Serum)",
        range: "30.0 - 100.0 ng/mL",
        unit: "ng/mL",
        hours: 36,
        home: 1,
      },
      {
        code: "LT-VITB12",
        name: "Vitamin B12 (Cobalamin)",
        category: "Biochemistry",
        description: "Critical nutrient measurement for nerve function, neurological stability, and pernicious anemia.",
        price: 2400,
        sample: "Blood (Serum)",
        range: "200 - 900 pg/mL",
        unit: "pg/mL",
        hours: 24,
        home: 1,
      },

      // Hormones & Endocrinology
      {
        code: "LT-GLUF",
        name: "Blood Glucose (Fasting)",
        category: "Hormones",
        description: "Baseline glucose evaluation after 8-10 hours fasting for diabetes mellitus screening.",
        price: 350,
        sample: "Blood (Fluoride)",
        range: "70 - 99 mg/dL",
        unit: "mg/dL",
        hours: 6,
        home: 1,
      },
      {
        code: "LT-HBA1C",
        name: "HbA1c Glycated Hemoglobin",
        category: "Hormones",
        description: "Reflects average blood sugar levels over past 90 days for diabetic management.",
        price: 1400,
        sample: "Blood (EDTA)",
        range: "Normal: < 5.7 %, Diabetic: >= 6.5 %",
        unit: "%",
        hours: 24,
        home: 1,
      },
      {
        code: "LT-THYROID",
        name: "Thyroid Function Profile (TSH, FT3, FT4)",
        category: "Hormones",
        description: "Differential diagnosis for hyperthyroidism, hypothyroidism, and autoimmune thyroiditis.",
        price: 2600,
        sample: "Blood (Serum)",
        range: "TSH: 0.45 - 4.5 uIU/mL, FT4: 0.8 - 1.8 ng/dL",
        unit: "uIU/mL",
        hours: 24,
        home: 1,
      },
      {
        code: "LT-CORTISOL",
        name: "Serum Cortisol (Morning 8 AM)",
        category: "Hormones",
        description: "Evaluates adrenal gland performance, stress response, and Cushing's or Addison's disease.",
        price: 2100,
        sample: "Blood (Serum)",
        range: "5.0 - 23.0 ug/dL",
        unit: "ug/dL",
        hours: 24,
        home: 1,
      },

      // Immunology & Serology
      {
        code: "LT-HBSAG",
        name: "Hepatitis B Surface Antigen (HBsAg Screening)",
        category: "Immunology",
        description: "Detects acute or chronic Hepatitis B viral infection via high-sensitivity immunochromatography / ELISA.",
        price: 750,
        sample: "Blood (Serum)",
        range: "Non-Reactive (Negative)",
        unit: "",
        hours: 12,
        home: 1,
      },
      {
        code: "LT-ANTIHCV",
        name: "Anti-HCV Antibody Screening",
        category: "Immunology",
        description: "Screening test for Hepatitis C antibodies indicating past exposure or chronic viral hepatitis.",
        price: 850,
        sample: "Blood (Serum)",
        range: "Non-Reactive (Negative)",
        unit: "",
        hours: 12,
        home: 1,
      },
      {
        code: "LT-DENGUE",
        name: "Dengue NS1 Antigen & IgM/IgG Antibodies",
        category: "Immunology",
        description: "Early acute phase marker (NS1) and antibody serology for dengue virus infection.",
        price: 1950,
        sample: "Blood (Serum)",
        range: "Negative",
        unit: "",
        hours: 12,
        home: 1,
      },
      {
        code: "LT-WIDAL",
        name: "Widal Agglutination Test (Typhoid)",
        category: "Immunology",
        description: "Detects agglutinating antibodies against Salmonella Typhi (O and H antigens) for enteric fever.",
        price: 650,
        sample: "Blood (Serum)",
        range: "Titre < 1:80 (Negative)",
        unit: "",
        hours: 12,
        home: 1,
      },

      // Microbiology
      {
        code: "LT-UCULT",
        name: "Urine Culture and Sensitivity (C/S)",
        category: "Microbiology",
        description: "Identifies pathogenic urinary bacterial organisms and antimicrobial susceptibility patterns.",
        price: 1550,
        sample: "Urine (Sterile Container)",
        range: "No Growth after 48 hrs",
        unit: "CFU/mL",
        hours: 48,
        home: 1,
      },
      {
        code: "LT-BCULT",
        name: "Blood Culture and Antibiotic Sensitivity",
        category: "Microbiology",
        description: "Detects bloodstream bacteremia, sepsis, and isolates causative organisms for targeted antibiotics.",
        price: 2500,
        sample: "Blood (Culture BACTEC Bottle)",
        range: "Sterile / No Growth",
        unit: "",
        hours: 72,
        home: 1,
      },

      // Clinical Pathology
      {
        code: "LT-URINE",
        name: "Urine Routine Examination (Urine R/E)",
        category: "Clinical Pathology",
        description: "Physical, chemical, and microscopic examination (Protein, Glucose, Pus Cells, RBCs, Crystals).",
        price: 450,
        sample: "Urine (Clean Catch Midstream)",
        range: "Color: Pale Yellow, Pus cells: 0-2 /HPF",
        unit: "/HPF",
        hours: 6,
        home: 1,
      },
      {
        code: "LT-STOOL",
        name: "Stool Routine Examination & Occult Blood",
        category: "Clinical Pathology",
        description: "Microscopic analysis for ova, cysts, parasites, and chemical test for gastrointestinal bleeding.",
        price: 550,
        sample: "Stool (Clean Specimen Cup)",
        range: "No ova/cysts seen. Occult blood: Negative",
        unit: "",
        hours: 8,
        home: 1,
      },

      // Diagnostic Screening / Imaging
      {
        code: "LT-ECG",
        name: "12-Lead Electrocardiogram (ECG)",
        category: "Imaging/Diagnostic",
        description: "Electrophysiological recording of cardiac rhythm, conduction intervals, ischemia, and arrhythmias.",
        price: 800,
        sample: "In-Clinic Diagnostic Procedure",
        range: "Normal Sinus Rhythm (HR 60-100 bpm)",
        unit: "bpm",
        hours: 2,
        home: 0, // In-clinic equipment only
      },
      {
        code: "LT-XRAYCHEST",
        name: "Digital Chest X-Ray (PA View)",
        category: "Imaging/Diagnostic",
        description: "Radiographic thoracic imaging for pulmonary consolidation, pneumonia, cardiomegaly, and ribs.",
        price: 1200,
        sample: "In-Clinic Radiology Suite",
        range: "Clear lung fields, Normal cardiothoracic ratio",
        unit: "",
        hours: 4,
        home: 0, // In-clinic equipment only
      },
      {
        code: "LT-USGABD",
        name: "Ultrasound Whole Abdomen & Pelvis",
        category: "Imaging/Diagnostic",
        description: "High-resolution sonographic evaluation of liver, gallbladder, kidneys, spleen, pancreas, and bladder.",
        price: 2800,
        sample: "In-Clinic Ultrasound Suite (Fasting Required)",
        range: "Normal organ morphology and echotexture",
        unit: "",
        hours: 6,
        home: 0, // In-clinic equipment only
      },
    ];

    for (const t of realisticLabTests) {
      await pool
        .request()
        .input("test_code", sql.NVarChar, t.code)
        .input("name", sql.NVarChar, t.name)
        .input("category", sql.NVarChar, t.category)
        .input("description", sql.NVarChar, t.description)
        .input("price", sql.Decimal(10, 2), t.price)
        .input("sample_type", sql.NVarChar, t.sample)
        .input("normal_range", sql.NVarChar, t.range)
        .input("unit", sql.NVarChar, t.unit)
        .input("turnaround_hours", sql.Int, t.hours)
        .input("is_home_collection_available", sql.Bit, t.home)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM lab_tests WHERE test_code = @test_code)
          BEGIN
            INSERT INTO lab_tests (
              test_code, name, category, description, price, sample_type,
              normal_range, unit, turnaround_hours, is_home_collection_available, status
            )
            VALUES (
              @test_code, @name, @category, @description, @price, @sample_type,
              @normal_range, @unit, @turnaround_hours, @is_home_collection_available, 'active'
            )
          END
          ELSE
          BEGIN
            UPDATE lab_tests
            SET
              name = @name,
              category = @category,
              description = @description,
              price = @price,
              sample_type = @sample_type,
              normal_range = @normal_range,
              unit = @unit,
              turnaround_hours = @turnaround_hours,
              is_home_collection_available = @is_home_collection_available,
              status = 'active'
            WHERE test_code = @test_code
          END
        `);
    }
    console.log("Laboratory catalog seeded & synchronized successfully.");

    // 7. Safely populate essential pharmacy medicines & batches (preserving all existing records)
    const essentialMedicines = [
      {
        name: "Ibuprofen 400mg",
        category: "Analgesic",
        unit_price: 10,
        reorder_level: 25,
        initial_quantity: 150, // In stock
      },
      {
        name: "Azithromycin 500mg",
        category: "Antibiotic",
        unit_price: 45,
        reorder_level: 20,
        initial_quantity: 80, // In stock
      },
      {
        name: "Ciprofloxacin 500mg",
        category: "Antibiotic",
        unit_price: 35,
        reorder_level: 20,
        initial_quantity: 120, // In stock
      },
      {
        name: "Atorvastatin 20mg",
        category: "Cardiovascular",
        unit_price: 25,
        reorder_level: 20,
        initial_quantity: 100, // In stock
      },
      {
        name: "Losartan 50mg",
        category: "Antihypertensive",
        unit_price: 22,
        reorder_level: 20,
        initial_quantity: 90, // In stock
      },
      {
        name: "Clarithromycin 500mg",
        category: "Antibiotic",
        unit_price: 60,
        reorder_level: 15,
        initial_quantity: 40, // In stock
      },
      {
        name: "Warfarin 5mg",
        category: "Anticoagulant",
        unit_price: 18,
        reorder_level: 20,
        initial_quantity: 50, // In stock
      },
      {
        name: "Aspirin 75mg (Cardioprotective)",
        category: "Cardiovascular",
        unit_price: 5,
        reorder_level: 30,
        initial_quantity: 250, // In stock
      },
      {
        name: "Insulin Regular 100IU/ml",
        category: "Antidiabetic",
        unit_price: 650,
        reorder_level: 10,
        initial_quantity: 8, // Low Stock (< reorder_level: 10)
      },
      {
        name: "Cough Syrup Dextromethorphan",
        category: "Respiratory",
        unit_price: 95,
        reorder_level: 20,
        initial_quantity: 5, // Low Stock (< reorder_level: 20)
      },
      {
        name: "ORS Oral Rehydration Salts",
        category: "Electrolyte",
        unit_price: 20,
        reorder_level: 50,
        initial_quantity: 300, // In stock
      },
      {
        name: "Tramadol 50mg",
        category: "Analgesic",
        unit_price: 30,
        reorder_level: 15,
        initial_quantity: 0, // Out of Stock (0 quantity)
      },
    ];

    for (const med of essentialMedicines) {
      // Check if medicine exists
      const existingMedRes = await pool
        .request()
        .input("name", sql.NVarChar, med.name)
        .query("SELECT id FROM medicines WHERE name = @name");

      let medId;
      if (existingMedRes.recordset.length === 0) {
        const insertMedRes = await pool
          .request()
          .input("name", sql.NVarChar, med.name)
          .input("category", sql.NVarChar, med.category)
          .input("unit_price", sql.Decimal(10, 2), med.unit_price)
          .input("reorder_level", sql.Int, med.reorder_level)
          .query(`
            INSERT INTO medicines (name, category, unit_price, reorder_level, status)
            OUTPUT INSERTED.id
            VALUES (@name, @category, @unit_price, @reorder_level, 'active')
          `);
        medId = insertMedRes.recordset[0].id;
      } else {
        medId = existingMedRes.recordset[0].id;
      }

      // Check if medicine has any batches
      const batchCheckRes = await pool
        .request()
        .input("medId", sql.UniqueIdentifier, medId)
        .query("SELECT COUNT(*) AS count FROM medicine_batches WHERE medicine_id = @medId");

      if (batchCheckRes.recordset[0].count === 0 && med.initial_quantity > 0) {
        const batchNo = shortCode("B");
        await pool
          .request()
          .input("medId", sql.UniqueIdentifier, medId)
          .input("batchNo", sql.NVarChar, batchNo)
          .input("quantity", sql.Int, med.initial_quantity)
          .query(`
            INSERT INTO medicine_batches (medicine_id, batch_no, quantity, purchase_date, expiry_date)
            VALUES (@medId, @batchNo, @quantity, CAST(GETDATE() AS DATE), DATEADD(YEAR, 2, GETDATE()))
          `);
      }
    }
    console.log("Pharmacy essential medicines & inventory verified.");

    // 8. employee_attendance
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'employee_attendance')
      BEGIN
        CREATE TABLE employee_attendance (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          employee_id UNIQUEIDENTIFIER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          attendance_date DATE NOT NULL,
          status NVARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')),
          check_in_time NVARCHAR(20) NULL,
          check_out_time NVARCHAR(20) NULL,
          remarks NVARCHAR(255) NULL,
          created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          CONSTRAINT UQ_employee_date UNIQUE (employee_id, attendance_date)
        );
        CREATE INDEX idx_attendance_date ON employee_attendance(attendance_date);
      END
    `);

    // 9. employee_leaves
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'employee_leaves')
      BEGIN
        CREATE TABLE employee_leaves (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          employee_id UNIQUEIDENTIFIER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          leave_type NVARCHAR(50) NOT NULL CHECK (leave_type IN ('casual', 'sick', 'annual', 'unpaid', 'maternity', 'emergency')),
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          days_count INT NOT NULL DEFAULT 1,
          reason NVARCHAR(500) NULL,
          status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
          approved_by UNIQUEIDENTIFIER NULL REFERENCES staff_users(id),
          created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );
        CREATE INDEX idx_leaves_employee ON employee_leaves(employee_id);
      END
    `);
    console.log("HR employee attendance & leaves tables verified.");

    // 10. Ensure patients table has gender column
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'patients' AND COLUMN_NAME = 'gender'
      )
      BEGIN
        ALTER TABLE patients ADD gender NVARCHAR(20) NULL;
      END
    `);

    console.log("Database migrations & schema verification completed successfully.");
  } catch (err) {
    console.error("Migration error:", err.message);
    throw err;
  }
}

module.exports = { ensureMigrations };
