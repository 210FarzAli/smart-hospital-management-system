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

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({}));

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
};

// ---------------------------------------------------------------------------
// Prescriptions
// ---------------------------------------------------------------------------
export interface MedicineLine {
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
  list: () =>
    request<HospitalReview[]>("/reviews"),

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

  // Pharmacy report
  pharmacySales: number;
  pharmacyRevenue: number;

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