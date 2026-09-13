// Talks to the local Express + SQL Server backend (see /backend).
// There is no cloud database involved here.

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("hospital_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    console.error("API Network Error:", err);
    throw new Error(
      "Unable to connect to the hospital service. Please check your internet connection or verify the hospital server is running."
    );
  }

  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({}));

    if (res.status === 401 && token) {
      clearSession();
    }

    throw new Error(
      body.error ||
        `Request failed (${res.status})`
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export interface AuthUser {
  staffUserId: string;
  role: string;
  fullName: string;
  email: string;
  doctorId: string | null;
}

export const authApi = {
  login: (
    email: string,
    password: string,
    role:
      | "admin"
      | "doctor"
      | "pharmacist"
      | "laboratorist"
      | "hr"
      | "receptionist"
  ) =>
    request<{
      token: string;
      user: AuthUser;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        role,
      }),
    }),

  me: () =>
    request<{ user: AuthUser }>(
      "/auth/me"
    ),
};

export function saveSession(
  token: string,
  user: AuthUser
) {
  localStorage.setItem(
    "hospital_token",
    token
  );

  localStorage.setItem(
    "hospital_user",
    JSON.stringify(user)
  );
}

export function clearSession() {
  localStorage.removeItem(
    "hospital_token"
  );

  localStorage.removeItem(
    "hospital_user"
  );
}

export function getStoredUser(): AuthUser | null {
  const raw =
    localStorage.getItem(
      "hospital_user"
    );

  return raw ? JSON.parse(raw) : null;
}

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------
import type {
  Department,
  Doctor,
  Appointment,
  Review,
  Employee,
  SalaryStructure,
  PayrollRecord,
  HRDashboardStats,
  ReceptionDashboardData,
  ReceptionSearchResult,
  EmployeeAttendance,
  EmployeeLeave,
  AvailableDoctor,
  DoctorNextSlot,
  DoctorAvailableDate,
} from "./types";

export const departmentsApi = {
  list: () =>
    request<Department[]>(
      "/departments"
    ),

  get: (id: string) =>
    request<Department>(
      `/departments/${id}`
    ),
};

// ---------------------------------------------------------------------------
// Doctors
// ---------------------------------------------------------------------------
export const doctorsApi = {
  // Public doctor list — active doctors only
  list: (
    params: {
      departmentId?: string;
      search?: string;
    } = {}
  ) => {
    const query =
      new URLSearchParams();

    if (params.departmentId) {
      query.set(
        "departmentId",
        params.departmentId
      );
    }

    if (params.search) {
      query.set(
        "search",
        params.search
      );
    }

    const qs =
      query.toString();

    return request<Doctor[]>(
      `/doctors${
        qs ? `?${qs}` : ""
      }`
    );
  },

  // Public single doctor
  get: (id: string) =>
    request<Doctor>(
      `/doctors/${id}`
    ),

  // Admin — all doctors,
  // including active and inactive
  adminList: (
    params: {
      status?:
        | "active"
        | "inactive";
      departmentId?: string;
      search?: string;
    } = {}
  ) => {
    const query =
      new URLSearchParams();

    if (params.status) {
      query.set(
        "status",
        params.status
      );
    }

    if (params.departmentId) {
      query.set(
        "departmentId",
        params.departmentId
      );
    }

    if (params.search) {
      query.set(
        "search",
        params.search
      );
    }

    const qs =
      query.toString();

    return request<Doctor[]>(
      `/doctors/admin${
        qs ? `?${qs}` : ""
      }`
    );
  },

  // Admin — create doctor
  create: (
    data: Partial<Doctor>
  ) =>
    request<Doctor>(
      "/doctors",
      {
        method: "POST",
        body: JSON.stringify(
          data
        ),
      }
    ),

  // Admin/Doctor — update doctor
  update: (
    id: string,
    data: Partial<Doctor>
  ) =>
    request<Doctor>(
      `/doctors/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(
          data
        ),
      }
    ),
};

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------
export interface BookAppointmentInput {
  full_name: string;
  age: number;
  phone: string;
  email: string;
  doctor_id: string;
  appointment_date: string;

  // Kept for compatibility with the existing database/API.
  // This represents the SHIFT START,
  // not an exact consultation time.
  appointment_time?: string;

  reason?: string;
}

export interface DoctorShift {
  day: string;
  start_time: string;
  end_time: string;
  label: string;
}

export interface DoctorAvailability {
  doctor: {
    id: string;
    full_name: string;
    specialization: string;
  };

  date: string;
  day: string;

  available: boolean;

  schedule?: {
    start_time: string;
    end_time: string;
  };

  shift: DoctorShift | null;

  // Kept for compatibility with older frontend code.
  // This is now a single shift,
  // NOT multiple exact appointment times.
  available_slots: DoctorShift[];
}

export const appointmentsApi = {
  book: (
    data: BookAppointmentInput
  ) =>
    request<{
      appointment: Appointment;
    }>("/appointments", {
      method: "POST",
      body: JSON.stringify(
        data
      ),
    }),

  availability: (
    doctorId: string,
    date: string
  ) =>
    request<DoctorAvailability>(
      `/appointments/availability?doctorId=${encodeURIComponent(
        doctorId
      )}&date=${encodeURIComponent(
        date
      )}`
    ),

  listAll: () =>
    request<Appointment[]>(
      "/appointments"
    ),

  listMine: () =>
    request<Appointment[]>(
      "/appointments/mine"
    ),

  updateStatus: (
    id: string,
    status: Appointment["status"]
  ) =>
    request<Appointment>(
      `/appointments/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status,
        }),
      }
    ),

  availableDoctors: (date: string) =>
    request<AvailableDoctor[]>(
      `/appointments/available-doctors?date=${encodeURIComponent(date)}`
    ),

  nextSlot: (doctorId: string, date: string) =>
    request<DoctorNextSlot>(
      `/appointments/next-slot?doctorId=${encodeURIComponent(
        doctorId
      )}&date=${encodeURIComponent(date)}`
    ),

  doctorDates: (doctorId: string) =>
    request<DoctorAvailableDate[]>(
      `/appointments/doctor-dates?doctorId=${encodeURIComponent(doctorId)}`
    ),
};

// ---------------------------------------------------------------------------
// Prescriptions
// ---------------------------------------------------------------------------
export interface MedicineLine {
  medicine_id: string;
  medicine_name: string;
  quantity: string;
  dosage: string;
  duration: string;
}

export const prescriptionsApi = {
  create: (data: {
    appointment_id: string;
    patient_id: string;
    consultation_notes: string;
    medicines: MedicineLine[];
  }) =>
    request(
      "/prescriptions",
      {
        method: "POST",
        body: JSON.stringify(
          data
        ),
      }
    ),
};

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Reviews — Hospital / Website Reviews
// ---------------------------------------------------------------------------

export interface HospitalReview {
  id: string;
  patient_id: string | null;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  is_verified_patient: boolean;
  is_approved: boolean;
  is_hidden: boolean;
  created_at: string;
}

export interface ReviewSummary {
  totalReviews: number;
  averageRating: number;
}

export const reviewsApi = {
  list: (doctorId?: string) =>
    request<HospitalReview[]>(`/reviews${doctorId ? `?doctorId=${encodeURIComponent(doctorId)}` : ""}`),

  create: (data: {
    reviewer_name: string;
    rating: number;
    comment?: string;
    patient_id?: string | null;
    is_verified_patient?: boolean;
  }) =>
    request<HospitalReview>("/reviews", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  adminList: () =>
    request<HospitalReview[]>("/reviews/admin"),

  summary: () =>
    request<ReviewSummary>("/reviews/admin/summary"),

  update: (
    id: string,
    data: {
      is_approved: boolean;
      is_hidden: boolean;
    }
  ) =>
    request<HospitalReview>(`/reviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ---------------------------------------------------------------------------
// Pharmacy
// ---------------------------------------------------------------------------
export interface PharmacyMedicine {
  id: string;
  name: string;
  category: string | null;
  unit_price: number;
  reorder_level: number;
  in_stock: number;
  status: "active" | "inactive";
}

export interface PrescriptionPatientMedicine {
  prescription_detail_id: string;

  medicine_name: string;
  prescribed_quantity: string;
  dosage: string | null;
  duration: string | null;

  medicine_id: string | null;
  inventory_medicine_name: string | null;
  unit_price: number | null;
}

export interface PrescriptionPatient {
  id: string;
  patient_code: string;
  full_name: string;
  phone: string | null;
  email: string | null;

  prescription_id: string;
  prescription_date: string;

  doctor_id: string;
  doctor_name: string;
  doctor_specialization: string;

  medicines: PrescriptionPatientMedicine[];
}

export interface PharmacySaleItem {
  medicine_id: string;
  quantity: number;
  unit_price: number;
}

export interface PharmacyCustomer {
  full_name: string;
  phone?: string;
  email?: string;
}

export interface CreatePharmacySaleInput {
  customer?: PharmacyCustomer;

  patient_id?: string | null;

  sale_type?:
    | "walk_in"
    | "prescription";

  items: PharmacySaleItem[];
}

export interface PharmacySaleResponse {
  sale: {
    id: string;
    sale_code: string;
    customer_id: string | null;
    patient_id: string | null;
    sale_type: string;
    total_amount: number;
    discount_amount: number;
    sold_by: string | null;
    created_at: string;
  };

  receiptCode: string;
  emailStatus: string;
}

export interface PharmacyCustomerRecord {
  id: string;
  customer_code: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  purchase_count: number;
  total_spent: number;
  last_purchase_at: string | null;
}

export interface PharmacySale {
  id: string;
  sale_code: string;
  sale_type: string;
  total_amount: number;
  created_at: string;

  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;

  referring_doctor: string | null;

  sold_by: string | null;

  receipt_code: string | null;
  email_status: string | null;
  emailed_at: string | null;
}

export const pharmacyApi = {
  medicines: () =>
    request<PharmacyMedicine[]>(
      "/pharmacy/medicines"
    ),
  publicMedicines: () =>
    request<PharmacyMedicine[]>(
      "/pharmacy/public-medicines"
    ),


  prescriptionPatients: () =>
    request<PrescriptionPatient[]>(
      "/pharmacy/prescription-patients"
    ),  

  createMedicine: (data: {
    name: string;
    category?: string | null;
    unit_price: number;
    reorder_level: number;
    batch_no: string;
    quantity: number;
    purchase_date?: string | null;
    expiry_date: string;
  }) =>
    request<{
      medicine: PharmacyMedicine;
      batch: {
        id: string;
        medicine_id: string;
        batch_no: string;
        quantity: number;
        purchase_date: string;
        expiry_date: string;
        created_at: string;
      };
    }>("/pharmacy/medicines", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateMedicine: (
    id: string,
    data: {
      name?: string;
      category?: string | null;
      unit_price?: number;
      reorder_level?: number;
      status?: "active" | "inactive";
    }
  ) =>
    request<PharmacyMedicine>(
      `/pharmacy/medicines/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    ),

  createSale: (
    data: CreatePharmacySaleInput
  ) =>
    request<PharmacySaleResponse>(
      "/pharmacy/sales",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  customers: () =>
    request<PharmacyCustomerRecord[]>(
      "/pharmacy/customers"
    ),

  sales: () =>
    request<PharmacySale[]>(
      "/pharmacy/sales"
    ),
};

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export type ReportPeriod =
  | "all"
  | "day"
  | "week"
  | "month";

export interface ReportOverview {
  doctors: number;
  patients: number;
  appointmentsToday: number;
  pendingAppointments: number;
  confirmedAppointments?: number;
  totalAppointments?: number;

  // Pharmacy report
  pharmacySales: number;
  pharmacyRevenue: number;

  // Laboratory report
  labBookings?: number;
  labCompletedTests?: number;
  labRevenue?: number;

  // Selected report period
  reportPeriod: ReportPeriod;
  reportPeriodLabel: string;
  reportDate: string | null;

  // Reviews
  totalReviews: number;
  averageRating: number;
}

export const reportsApi = {
  overview: (
    params: {
      period?: ReportPeriod;
      date?: string;
    } = {}
  ) => {
    const query =
      new URLSearchParams();

    if (params.period) {
      query.set(
        "period",
        params.period
      );
    }

    if (params.date) {
      query.set(
        "date",
        params.date
      );
    }

    const qs =
      query.toString();

    return request<ReportOverview>(
      `/reports/overview${
        qs ? `?${qs}` : ""
      }`
    );
  },
};

// ---------------------------------------------------------------------------
// AI Health Assistant
// ---------------------------------------------------------------------------
export const assistantApi = {
  sendMessage: (
    sessionToken: string,
    message: string
  ) =>
    request<{
      reply: string;
      language: string;
    }>("/assistant/message", {
      method: "POST",
      body: JSON.stringify({
        sessionToken,
        message,
      }),
    }),
};

// ---------------------------------------------------------------------------
// Laboratory API
// ---------------------------------------------------------------------------
import type { LabTest, LabBooking, PharmacyOnlineOrder } from "./types";

export const laboratoryApi = {
  // Public
  tests: () => request<LabTest[]>("/laboratory/tests"),

  track: (trackingId: string) =>
    request<{ booking: LabBooking }>("/laboratory/track/" + encodeURIComponent(trackingId)),

  book: (data: {
    patient_name: string;
    patient_phone: string;
    patient_email?: string;
    patient_age?: number;
    patient_gender?: string;
    service_type: "in_clinic" | "home_service";
    booking_date: string;
    booking_time?: string;
    home_address?: string;
    notes?: string;
    test_ids: string[];
  }) =>
    request<{ booking: LabBooking; message: string }>("/laboratory/book", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Staff & Admin
  adminBookings: (params?: { service_type?: string; status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.service_type) query.set("service_type", params.service_type);
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return request<LabBooking[]>(`/laboratory/bookings${qs ? `?${qs}` : ""}`);
  },

  getBooking: (id: string) => request<LabBooking>(`/laboratory/bookings/${id}`),

  updateStatus: (id: string, status: string) =>
    request<LabBooking>(`/laboratory/bookings/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  recordResults: (
    id: string,
    results: {
      itemId: string;
      resultValue: string;
      status?: "completed" | "in_progress" | "pending" | "normal" | "abnormal";
      normalRange?: string;
      unit?: string;
      remarks?: string;
    }[]
  ) =>
    request<{ message: string; items: any[] }>(`/laboratory/bookings/${id}/results`, {
      method: "POST",
      body: JSON.stringify({ results }),
    }),

  walkIn: (data: {
    patient_name: string;
    patient_phone: string;
    patient_email?: string;
    patient_age?: number;
    patient_gender?: string;
    notes?: string;
    test_ids: string[];
  }) =>
    request<{ booking: LabBooking; tracking_id: string; message: string }>("/laboratory/walk-in", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  patientHistory: (params: { phone?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params.phone) query.set("phone", params.phone);
    if (params.search) query.set("search", params.search);
    return request<LabBooking[]>(`/laboratory/patient-history?${query.toString()}`);
  },

  stats: () =>
    request<{
      totalBookings: number;
      pendingHomeRequests: number;
      samplesInProgress: number;
      completedBookings: number;
      activeTestsCount: number;
      totalRevenue: number;
    }>("/laboratory/stats"),

  createTest: (data: Partial<LabTest>) =>
    request<LabTest>("/laboratory/tests", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTest: (id: string, data: Partial<LabTest>) =>
    request<LabTest>(`/laboratory/tests/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// ---------------------------------------------------------------------------
// Online Pharmacy Shop API
// ---------------------------------------------------------------------------
export interface CatalogMedicine {
  id: string;
  name: string;
  category: string | null;
  unit_price: number;
  in_stock: number;
  reorder_level?: number;
}

export const onlinePharmacyApi = {
  // Public
  catalog: () => request<CatalogMedicine[]>("/pharmacy/catalog"),

  placeOrder: (data: {
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    delivery_address: string;
    notes?: string;
    items: { medicine_id: string; quantity: number }[];
  }) =>
    request<{ order: PharmacyOnlineOrder; message: string }>("/pharmacy/orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Staff & Admin
  orders: (params?: { status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return request<PharmacyOnlineOrder[]>(`/pharmacy/orders${qs ? `?${qs}` : ""}`);
  },

  getOrder: (id: string) => request<PharmacyOnlineOrder>(`/pharmacy/orders/${id}`),

  updateStatus: (id: string, status: string) =>
    request<PharmacyOnlineOrder>(`/pharmacy/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

// ---------------------------------------------------------------------------
// HR (Human Resources) API
// ---------------------------------------------------------------------------
export const hrApi = {
  dashboard: () => request<HRDashboardStats>("/hr/dashboard"),

  employees: (params?: { search?: string; department_id?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.department_id) query.set("department_id", params.department_id);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return request<Employee[]>(`/hr/employees${qs ? `?${qs}` : ""}`);
  },

  createEmployee: (data: Partial<Employee>) =>
    request<{ employee: Employee; message: string }>("/hr/employees", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateEmployee: (id: string, data: Partial<Employee>) =>
    request<{ employee: Employee; message: string }>(`/hr/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  salaryStructures: () => request<SalaryStructure[]>("/hr/salary-structures"),

  setSalaryStructure: (data: {
    employee_id: string;
    basic_salary: number;
    allowances?: number;
    overtime_rate?: number;
    effective_from?: string;
  }) =>
    request<{ salaryStructure: SalaryStructure; message: string }>("/hr/salary-structures", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  payroll: (params?: { month?: number | string; year?: number | string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.month) query.set("month", String(params.month));
    if (params?.year) query.set("year", String(params.year));
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return request<PayrollRecord[]>(`/hr/payroll${qs ? `?${qs}` : ""}`);
  },

  generatePayroll: (month: number, year: number) =>
    request<{ message: string; generatedCount: number }>("/hr/payroll/generate", {
      method: "POST",
      body: JSON.stringify({ month, year }),
    }),

  markPayrollPaid: (id: string, status: string = "paid") =>
    request<{ payroll: PayrollRecord; message: string }>(`/hr/payroll/${id}/pay`, {
      method: "PUT",
      body: JSON.stringify({ payment_status: status }),
    }),

  attendance: (params?: { date?: string; employee_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.date) query.set("date", params.date);
    if (params?.employee_id) query.set("employee_id", params.employee_id);
    const qs = query.toString();
    return request<EmployeeAttendance[]>(`/hr/attendance${qs ? `?${qs}` : ""}`);
  },

  markAttendance: (data: {
    employee_id: string;
    attendance_date?: string;
    status: string;
    check_in_time?: string;
    check_out_time?: string;
    remarks?: string;
  }) =>
    request<{ attendance: EmployeeAttendance; message: string }>("/hr/attendance", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  leaves: (params?: { status?: string; employee_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.employee_id) query.set("employee_id", params.employee_id);
    const qs = query.toString();
    return request<EmployeeLeave[]>(`/hr/leaves${qs ? `?${qs}` : ""}`);
  },

  applyLeave: (data: {
    employee_id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    days_count?: number;
    reason?: string;
  }) =>
    request<{ leave: EmployeeLeave; message: string }>("/hr/leaves", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateLeaveStatus: (id: string, status: string) =>
    request<{ leave: EmployeeLeave; message: string }>(`/hr/leaves/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
};

// ---------------------------------------------------------------------------
// Reception / Front Desk API
// ---------------------------------------------------------------------------
export const receptionApi = {
  dashboard: () => request<ReceptionDashboardData>("/reception/dashboard"),

  availableDoctors: (date: string) =>
    request<AvailableDoctor[]>(
      `/reception/available-doctors?date=${encodeURIComponent(date)}`
    ),

  nextSlot: (doctorId: string, date: string) =>
    request<DoctorNextSlot>(
      `/reception/next-slot?doctorId=${encodeURIComponent(
        doctorId
      )}&date=${encodeURIComponent(date)}`
    ),

  doctorDates: (doctorId: string) =>
    request<DoctorAvailableDate[]>(
      `/reception/doctor-dates?doctorId=${encodeURIComponent(doctorId)}`
    ),

  bookAppointment: (data: {
    full_name: string;
    phone: string;
    email?: string;
    age?: number;
    gender?: string;
    doctor_id: string;
    appointment_date: string;
    appointment_time?: string;
    reason?: string;
  }) =>
    request<{ message: string; appointment: any; patient: any }>("/reception/appointment", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  registerWalkin: (data: {
    full_name: string;
    phone: string;
    email?: string;
    age?: number;
    gender?: string;
    doctor_id: string;
    appointment_time?: string;
    reason?: string;
  }) =>
    request<{ message: string; appointment: any; patient: any }>("/reception/walkin", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  checkIn: (appointmentId: string) =>
    request<{ message: string; appointment: any }>(`/reception/checkin/${appointmentId}`, {
      method: "PUT",
    }),

  search: (query: string) =>
    request<ReceptionSearchResult>(`/reception/search?q=${encodeURIComponent(query)}`),

  patientDetails: (idOrPhone: string) =>
    request<{
      patient: any;
      appointments: any[];
      labBookings: any[];
      pharmacyOrders: any[];
    }>(`/reception/patient/${encodeURIComponent(idOrPhone)}`),
};

// ---------------------------------------------------------------------------
// Admin HR Management API
// ---------------------------------------------------------------------------
export const adminApi = {
  hrList: () => request<any[]>("/admin/hr"),

  createHR: (data: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
    designation?: string;
    joining_date?: string;
  }) =>
    request<{ user: any; message: string }>("/admin/hr", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateHR: (id: string, data: { full_name?: string; phone?: string; designation?: string }) =>
    request<{ message: string }>(`/admin/hr/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  toggleHRStatus: (id: string, is_active: boolean) =>
    request<{ user: any; message: string }>(`/admin/hr/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active }),
    }),
};