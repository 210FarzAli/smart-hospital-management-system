export interface Department {
  id: string;
  name: string;
  description: string | null;
  services: string[];
  status: "active" | "inactive";
}

export interface Doctor {
  id: string;
  department_id: string;
  department_name?: string;
  full_name: string;
  photo_url: string | null;
  specialization: string;
  qualification: string | null;
  experience_years: number;
  consultation_fee: number;
  availability: {
    day: string;
    start_time: string;
    end_time: string;
  }[];
  description: string | null;
  rating: number;
  status: "active" | "inactive";
}

export interface Patient {
  id: string;
  patient_code: string;
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  preferred_channel: "email" | "whatsapp";
}

export interface Appointment {
  id: string;
  appointment_code: string;
  patient_id: string;
  doctor_id: string;

  appointment_date: string;

  // Kept for compatibility with the existing database.
  // This represents the doctor's SHIFT START,
  // NOT an exact patient consultation time.
  appointment_time: string;

  // Doctor's working shift.
  shift_start?: string;
  shift_end?: string;
  shift_label?: string;

  reason: string | null;

  status:
    | "pending"
    | "confirmed"
    | "completed"
    | "cancelled";

  // Convenience fields joined in by the backend.
  patient_name?: string;
  patient_phone?: string;
  patient_email?: string;
  patient_age?: number;

  doctor_name?: string;
  doctor_specialization?: string;
  department_name?: string;
}

export interface Review {
  id: string;
  doctor_id: string;
  doctor_name?: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  is_verified_patient: boolean;
  is_approved: boolean;
  created_at: string;
}

export interface Prescription {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  consultation_notes: string | null;
}

export interface PrescriptionDetail {
  id: string;
  prescription_id: string;
  medicine_name: string;
  quantity: string | null;
  dosage: string | null;
  duration: string | null;
}

export type StaffRole =
  | "admin"
  | "doctor"
  | "pharmacist"
  | "receptionist"
  | "hr"
  | "accountant";