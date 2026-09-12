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
  | "laboratorist"
  | "receptionist"
  | "hr"
  | "accountant";

export interface LabTest {
  id: string;
  test_code: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  sample_type: string;
  normal_range: string | null;
  unit: string | null;
  turnaround_hours: number;
  is_home_collection_available?: boolean;
  status: "active" | "inactive";
  created_at?: string;
}

export interface LabBookingItem {
  id: string;
  booking_id?: string;
  test_id?: string;
  test_name: string;
  price: number;
  result_value?: string | null;
  result_status: "pending" | "in_progress" | "completed" | "normal" | "abnormal";
  normal_range?: string | null;
  unit?: string | null;
  remarks?: string | null;
  completed_at?: string | null;
}

export interface LabBooking {
  id: string;
  booking_code: string;
  tracking_id: string;
  patient_name: string;
  patient_phone: string;
  patient_email: string | null;
  patient_age: number | null;
  patient_gender: string | null;
  service_type: "in_clinic" | "home_service";
  booking_date: string;
  booking_time: string | null;
  home_address: string | null;
  notes: string | null;
  status:
    | "booked"
    | "sample_collection_pending"
    | "sample_collected"
    | "processing"
    | "result_ready"
    | "completed"
    | "cancelled"
    | "pending"
    | "confirmed"
    | "in_progress";
  total_amount: number;
  total_tests?: number;
  completed_tests?: number;
  items?: LabBookingItem[];
  created_at: string;
}

export interface PharmacyOnlineOrderItem {
  id?: string;
  order_id?: string;
  medicine_id: string;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface PharmacyOnlineOrder {
  id: string;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_address: string;
  notes: string | null;
  total_amount: number;
  status: "pending" | "confirmed" | "ready" | "completed" | "cancelled";
  items_count?: number;
  items?: PharmacyOnlineOrderItem[];
  created_at: string;
  updated_at: string;
}