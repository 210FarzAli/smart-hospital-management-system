/* ============================================================================
   SMART HOSPITAL MANAGEMENT SYSTEM — SQL SERVER SCHEMA

   Database:
      SmartHospitalDB

   Architecture:
      React/Vite Frontend
          ↓
      Node.js / Express Backend
          ↓
      SQL Server

   IMPORTANT:
      This file represents the intended database structure for a fresh
      installation of the Smart Hospital Management System.

      The current development database already exists, so DO NOT run this
      entire file against the existing SmartHospitalDB.
============================================================================ */


/* ============================================================================
   STAFF & ROLES

   Roles:
      admin
      doctor
      pharmacist
      receptionist
      hr
      accountant

   Admin and Doctor have dedicated frontend login screens.
   Other staff roles use the staff login.
============================================================================ */

CREATE TABLE staff_users (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  full_name NVARCHAR(150) NOT NULL,
  email NVARCHAR(150) NOT NULL UNIQUE,
  password_hash NVARCHAR(255) NOT NULL,

  role NVARCHAR(20) NOT NULL
    CHECK (
      role IN (
        'admin',
        'doctor',
        'pharmacist',
        'receptionist',
        'hr',
        'accountant'
      )
    ),

  is_active BIT NOT NULL DEFAULT 1,

  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);


/* ============================================================================
   DEPARTMENTS
============================================================================ */

CREATE TABLE departments (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  name NVARCHAR(100) NOT NULL UNIQUE,

  description NVARCHAR(500),

  services NVARCHAR(1000),

  status NVARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),

  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);


/* ============================================================================
   EMPLOYEES
============================================================================ */

CREATE TABLE employees (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  staff_user_id UNIQUEIDENTIFIER NULL
    REFERENCES staff_users(id)
    ON DELETE SET NULL,

  full_name NVARCHAR(150) NOT NULL,

  phone NVARCHAR(30),

  email NVARCHAR(150),

  department_id UNIQUEIDENTIFIER NULL
    REFERENCES departments(id)
    ON DELETE SET NULL,

  designation NVARCHAR(100),

  joining_date DATE,

  employment_status NVARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (
      employment_status IN (
        'active',
        'on_leave',
        'terminated'
      )
    ),

  qualification NVARCHAR(200),

  emergency_contact NVARCHAR(100),

  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);


/* ============================================================================
   SALARY STRUCTURES
============================================================================ */

CREATE TABLE salary_structures (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  employee_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES employees(id)
    ON DELETE CASCADE,

  basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0,

  allowances DECIMAL(12,2) NOT NULL DEFAULT 0,

  overtime_rate DECIMAL(12,2) NOT NULL DEFAULT 0,

  effective_from DATE NOT NULL
    DEFAULT CAST(GETDATE() AS DATE),

  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);


/* ============================================================================
   PAYROLL
============================================================================ */

CREATE TABLE payroll (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  employee_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES employees(id)
    ON DELETE CASCADE,

  period_month INT NOT NULL,

  period_year INT NOT NULL,

  basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0,

  allowances DECIMAL(12,2) NOT NULL DEFAULT 0,

  overtime DECIMAL(12,2) NOT NULL DEFAULT 0,

  bonuses DECIMAL(12,2) NOT NULL DEFAULT 0,

  deductions DECIMAL(12,2) NOT NULL DEFAULT 0,

  net_salary AS (
    basic_salary
    + allowances
    + overtime
    + bonuses
    - deductions
  ) PERSISTED,

  payment_status NVARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid')),

  paid_at DATETIME2 NULL,

  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

  CONSTRAINT uq_payroll_period
    UNIQUE (employee_id, period_month, period_year)
);


/* ============================================================================
   DOCTORS
============================================================================ */

CREATE TABLE doctors (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  staff_user_id UNIQUEIDENTIFIER NULL
    REFERENCES staff_users(id)
    ON DELETE SET NULL,

  department_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES departments(id)
    ON DELETE CASCADE,

  full_name NVARCHAR(150) NOT NULL,

  photo_url NVARCHAR(500),

  specialization NVARCHAR(150) NOT NULL,

  qualification NVARCHAR(200),

  experience_years INT NOT NULL DEFAULT 0,

  consultation_fee DECIMAL(10,2) NOT NULL DEFAULT 0,

  /*
    JSON example:

    [
      {
        "day": "Mon",
        "start_time": "09:00",
        "end_time": "14:00"
      },
      {
        "day": "Wed",
        "start_time": "09:00",
        "end_time": "14:00"
      }
    ]
  */

  availability NVARCHAR(MAX),

  description NVARCHAR(1000),

  rating DECIMAL(2,1) NOT NULL DEFAULT 0,

  status NVARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),

  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX idx_doctors_department
ON doctors(department_id);


/* ============================================================================
   PATIENTS

   Minimum necessary patient information.

   Current booking information:
      full_name
      age
      phone
      email

   Age is collected directly because it is useful for clinical context.

   date_of_birth remains available for future use but is not required during
   public appointment booking.
============================================================================ */

CREATE TABLE patients (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  patient_code NVARCHAR(20) NOT NULL UNIQUE,

  full_name NVARCHAR(150) NOT NULL,

  age INT NULL,

  phone NVARCHAR(30) NOT NULL,

  email NVARCHAR(150) NULL,

  date_of_birth DATE NULL,

  status NVARCHAR(20) NOT NULL DEFAULT 'active',

  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

  CONSTRAINT chk_patient_age
    CHECK (age IS NULL OR (age BETWEEN 1 AND 120))
);


/* ============================================================================
   MEDICAL HISTORY
============================================================================ */

CREATE TABLE medical_history (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  patient_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES patients(id)
    ON DELETE CASCADE,

  recorded_by UNIQUEIDENTIFIER NULL
    REFERENCES staff_users(id),

  note NVARCHAR(2000) NOT NULL,

  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);


/* ============================================================================
   APPOINTMENTS
============================================================================ */

CREATE TABLE appointments (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  appointment_code NVARCHAR(20) NOT NULL UNIQUE,

  patient_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES patients(id)
    ON DELETE CASCADE,

  doctor_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES doctors(id),

  appointment_date DATE NOT NULL,

  /*
    Stored as HH:mm text for simplicity.
    Example:
       09:00
       09:30
       10:00
  */

  appointment_time NVARCHAR(10) NOT NULL,

  reason NVARCHAR(500),

  status NVARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'confirmed',
        'completed',
        'cancelled'
      )
    ),

  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX idx_appointments_doctor_date
ON appointments(doctor_id, appointment_date);

CREATE INDEX idx_appointments_patient
ON appointments(patient_id);


/* ============================================================================
   APPOINTMENT NOTIFICATIONS

   EMAIL ONLY.

   WhatsApp has intentionally been removed from the project.
============================================================================ */

CREATE TABLE appointment_notifications (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  appointment_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES appointments(id)
    ON DELETE CASCADE,

  channel NVARCHAR(20) NOT NULL DEFAULT 'email'
    CHECK (channel = 'email'),

  status NVARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'sent',
        'failed',
        'not_sent'
      )
    ),

  sent_at DATETIME2 NULL,

  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);


/* ============================================================================
   PRESCRIPTIONS
============================================================================ */

CREATE TABLE prescriptions (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  appointment_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES appointments(id)
    ON DELETE CASCADE,

  patient_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES patients(id),

  doctor_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES doctors(id),

  consultation_notes NVARCHAR(2000),

  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);


/* ============================================================================
   PRESCRIPTION DETAILS
============================================================================ */

CREATE TABLE prescription_details (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  prescription_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES prescriptions(id)
    ON DELETE CASCADE,

  medicine_name NVARCHAR(150) NOT NULL,

  quantity NVARCHAR(50),

  dosage NVARCHAR(100),

  duration NVARCHAR(100)
);


/* ============================================================================
   PHARMACY — MEDICINES
============================================================================ */

CREATE TABLE medicines (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  name NVARCHAR(150) NOT NULL,

  category NVARCHAR(100),

  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,

  reorder_level INT NOT NULL DEFAULT 20,

  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);


/* ============================================================================
   PHARMACY — MEDICINE BATCHES
============================================================================ */

CREATE TABLE medicine_batches (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  medicine_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES medicines(id)
    ON DELETE CASCADE,

  batch_no NVARCHAR(50) NOT NULL,

  quantity INT NOT NULL DEFAULT 0,

  purchase_date DATE NOT NULL
    DEFAULT CAST(GETDATE() AS DATE),

  expiry_date DATE NOT NULL,

  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX idx_batches_medicine
ON medicine_batches(medicine_id);


/* ============================================================================
   PHARMACY — CUSTOMERS
============================================================================ */

CREATE TABLE pharmacy_customers (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  customer_code NVARCHAR(20) NOT NULL UNIQUE,

  full_name NVARCHAR(150) NOT NULL,

  phone NVARCHAR(30),

  email NVARCHAR(150),

  registration_date DATE NOT NULL
    DEFAULT CAST(GETDATE() AS DATE),

  total_purchases INT NOT NULL DEFAULT 0,

  total_spending DECIMAL(12,2) NOT NULL DEFAULT 0,

  last_purchase_at DATETIME2 NULL,

  loyalty_level NVARCHAR(20) NOT NULL DEFAULT 'New'
    CHECK (
      loyalty_level IN (
        'New',
        'Regular',
        'Loyal',
        'VIP'
      )
    ),

  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);


/* ============================================================================
   PHARMACY — SALES
============================================================================ */

CREATE TABLE pharmacy_sales (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  sale_code NVARCHAR(20) NOT NULL UNIQUE,

  customer_id UNIQUEIDENTIFIER NULL
    REFERENCES pharmacy_customers(id)
    ON DELETE SET NULL,

  patient_id UNIQUEIDENTIFIER NULL
    REFERENCES patients(id)
    ON DELETE SET NULL,

  sale_type NVARCHAR(20) NOT NULL
    CHECK (
      sale_type IN (
        'prescription',
        'walk_in'
      )
    ),

  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

  sold_by UNIQUEIDENTIFIER NULL
    REFERENCES staff_users(id),

  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);


/* ============================================================================
   PHARMACY — MEDICINE ISSUES
============================================================================ */

CREATE TABLE medicine_issues (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  sale_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES pharmacy_sales(id)
    ON DELETE CASCADE,

  prescription_id UNIQUEIDENTIFIER NULL
    REFERENCES prescriptions(id)
    ON DELETE SET NULL,

  medicine_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES medicines(id),

  batch_id UNIQUEIDENTIFIER NULL
    REFERENCES medicine_batches(id)
    ON DELETE SET NULL,

  quantity INT NOT NULL,

  unit_price DECIMAL(10,2) NOT NULL,

  line_total AS (
    quantity * unit_price
  ) PERSISTED
);


/* ============================================================================
   PHARMACY — RECEIPTS
============================================================================ */

CREATE TABLE receipts (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  sale_id UNIQUEIDENTIFIER NOT NULL UNIQUE
    REFERENCES pharmacy_sales(id)
    ON DELETE CASCADE,

  receipt_code NVARCHAR(20) NOT NULL UNIQUE,

  email_status NVARCHAR(20) NOT NULL DEFAULT 'not_sent'
    CHECK (
      email_status IN (
        'not_sent',
        'sent',
        'failed'
      )
    ),

  emailed_at DATETIME2 NULL,

  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);


/* ============================================================================
   DOCTOR REVIEWS
============================================================================ */

CREATE TABLE reviews (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  doctor_id UNIQUEIDENTIFIER NULL
    REFERENCES doctors(id)
    ON DELETE CASCADE,

  patient_id UNIQUEIDENTIFIER NULL
    REFERENCES patients(id)
    ON DELETE SET NULL,

  reviewer_name NVARCHAR(150) NOT NULL,

  rating INT NOT NULL
    CHECK (rating BETWEEN 1 AND 5),

  comment NVARCHAR(1000),

  is_verified_patient BIT NOT NULL DEFAULT 0,

  is_approved BIT NOT NULL DEFAULT 1,

  is_hidden BIT NOT NULL DEFAULT 0,

  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX idx_reviews_doctor
ON reviews(doctor_id);


/* ============================================================================
   AI HEALTH ASSISTANT — CONVERSATIONS

   Supports:
      English
      Urdu
      Roman Urdu
============================================================================ */

CREATE TABLE ai_conversations (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  patient_id UNIQUEIDENTIFIER NULL
    REFERENCES patients(id)
    ON DELETE SET NULL,

  session_token NVARCHAR(100) NOT NULL,

  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);


/* ============================================================================
   AI HEALTH ASSISTANT — MESSAGES
============================================================================ */

CREATE TABLE ai_messages (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

  conversation_id UNIQUEIDENTIFIER NOT NULL
    REFERENCES ai_conversations(id)
    ON DELETE CASCADE,

  role NVARCHAR(20) NOT NULL
    CHECK (
      role IN (
        'user',
        'assistant'
      )
    ),

  content NVARCHAR(MAX) NOT NULL,

  language NVARCHAR(10) NOT NULL DEFAULT 'en'
    CHECK (
      language IN (
        'en',
        'ur',
        'ur-roman'
      )
    ),

  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);


/* ============================================================================
   END OF SCHEMA
============================================================================ */