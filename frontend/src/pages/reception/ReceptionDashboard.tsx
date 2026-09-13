import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  receptionApi,
  doctorsApi,
  departmentsApi,
  laboratoryApi,
} from "../../lib/apiClient";
import type {
  ReceptionDashboardData,
  Doctor,
  Department,
  LabBooking,
  ReceptionSearchResult,
  AvailableDoctor,
  DoctorAvailableDate,
} from "../../lib/types";
import {
  Calendar,
  UserCheck,
  Clock,
  CheckCircle,
  Search,
  Plus,
  ShieldCheck,
  Phone,
  ArrowRight,
  X,
  Activity,
  FileText,
  AlertCircle,
  Stethoscope,
  Building,
  User,
} from "../../components/icons/Icons";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ReceptionDashboard() {
  const [data, setData] = useState<ReceptionDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Search filter for doctor status directory
  const [doctorSearch, setDoctorSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");

  // Modal 1: Book Appointment / Walk-in
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [bookingMode, setBookingMode] = useState<"scheduled" | "walkin">("scheduled");
  const [bookPatientName, setBookPatientName] = useState("");
  const [bookPatientPhone, setBookPatientPhone] = useState("");
  const [bookPatientEmail, setBookPatientEmail] = useState("");
  const [bookPatientAge, setBookPatientAge] = useState("");
  const [bookPatientGender, setBookPatientGender] = useState("Male");
  const [bookDoctorId, setBookDoctorId] = useState("");
  const [bookDate, setBookDate] = useState("");
  const [bookReason, setBookReason] = useState("Front desk OPD consultation");
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Scheduled mode: available dates for selected doctor
  const [doctorAvailableDates, setDoctorAvailableDates] = useState<DoctorAvailableDate[]>([]);
  const [loadingDoctorDates, setLoadingDoctorDates] = useState(false);

  // Walk-in mode: doctors available today
  const [availableDoctorsToday, setAvailableDoctorsToday] = useState<AvailableDoctor[]>([]);
  const [loadingDoctorsToday, setLoadingDoctorsToday] = useState(false);

  // Modal 2: Patient 360 Profile (Patient Lookup)
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [patientProfileSearch, setPatientProfileSearch] = useState("");
  const [patientProfile, setPatientProfile] = useState<any | null>(null);
  const [loadingPatientProfile, setLoadingPatientProfile] = useState(false);
  const [patientProfileError, setPatientProfileError] = useState<string | null>(null);

  // Modal 3: Lab Report Lookup
  const [labModalOpen, setLabModalOpen] = useState(false);
  const [labTrackingInput, setLabTrackingInput] = useState("");
  const [labBookingDetails, setLabBookingDetails] = useState<LabBooking | null>(null);
  const [loadingLabDetails, setLoadingLabDetails] = useState(false);
  const [labError, setLabError] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const activeDoctors = useMemo(() => {
    return doctorsList.filter((d) => d.status === "active");
  }, [doctorsList]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [res, docs, depts] = await Promise.all([
        receptionApi.dashboard(),
        doctorsApi.list().catch(() => []),
        departmentsApi.list().catch(() => []),
      ]);
      setData(res);
      setDoctorsList(docs || []);
      setDepartments(depts || []);
    } catch (err) {
      console.error("Failed to load reception dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  // When Scheduled mode is active and bookModal is open:
  // If no doctor selected yet, default to first active doctor
  useEffect(() => {
    if (!bookModalOpen) return;
    if (bookingMode === "scheduled") {
      if (!bookDoctorId && activeDoctors.length > 0) {
        setBookDoctorId(activeDoctors[0].id);
      }
    }
  }, [bookModalOpen, bookingMode, bookDoctorId, activeDoctors]);

  // Scheduled mode: Fetch available dates for selected doctor
  useEffect(() => {
    if (!bookModalOpen || bookingMode !== "scheduled" || !bookDoctorId) {
      if (bookingMode !== "scheduled") setDoctorAvailableDates([]);
      return;
    }

    let cancelled = false;
    setLoadingDoctorDates(true);
    receptionApi
      .doctorDates(bookDoctorId)
      .then((dates) => {
        if (cancelled) return;
        const list = dates || [];
        setDoctorAvailableDates(list);
        if (list.length > 0) {
          // If current bookDate is not in the available dates, default to first available
          if (!list.some((d) => d.date === bookDate)) {
            setBookDate(list[0].date);
          }
        } else {
          setBookDate("");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load doctor dates:", err);
        setDoctorAvailableDates([]);
        setBookDate("");
      })
      .finally(() => {
        if (!cancelled) setLoadingDoctorDates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookModalOpen, bookingMode, bookDoctorId]);

  // Walk-in mode: Fetch doctors available TODAY
  useEffect(() => {
    if (!bookModalOpen || bookingMode !== "walkin") {
      if (bookingMode !== "walkin") setAvailableDoctorsToday([]);
      return;
    }

    let cancelled = false;
    setLoadingDoctorsToday(true);
    receptionApi
      .availableDoctors(todayStr)
      .then((docs) => {
        if (cancelled) return;
        const list = docs || [];
        setAvailableDoctorsToday(list);
        if (list.length > 0) {
          if (!list.some((d) => d.id === bookDoctorId)) {
            setBookDoctorId(list[0].id);
          }
        } else {
          setBookDoctorId("");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load doctors available today:", err);
        setAvailableDoctorsToday([]);
        setBookDoctorId("");
      })
      .finally(() => {
        if (!cancelled) setLoadingDoctorsToday(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookModalOpen, bookingMode, todayStr]);

  // Selected date object in scheduled mode (has auto-assigned next slot)
  const selectedDateObj = useMemo(() => {
    return doctorAvailableDates.find((d) => d.date === bookDate) || null;
  }, [doctorAvailableDates, bookDate]);

  // Selected doctor in walk-in mode (has auto-assigned queue time)
  const selectedWalkinDoctor = useMemo(() => {
    return availableDoctorsToday.find((d) => d.id === bookDoctorId) || null;
  }, [availableDoctorsToday, bookDoctorId]);

  async function handleCheckIn(id: string) {
    try {
      await receptionApi.checkIn(id);
      loadDashboard();
    } catch (err: any) {
      alert(err.message || "Failed to mark patient as checked-in.");
    }
  }

  // Handle Book Appointment submit
  async function handleBookSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBookingError(null);
    setBookingSuccessMsg(null);

    if (bookingMode === "walkin") {
      if (!bookDoctorId || !selectedWalkinDoctor) {
        setBookingError("Please select an on-duty doctor available today.");
        return;
      }

      setSubmittingBooking(true);
      try {
        const res = await receptionApi.registerWalkin({
          full_name: bookPatientName.trim(),
          phone: bookPatientPhone.trim(),
          email: bookPatientEmail.trim() || undefined,
          age: bookPatientAge ? Number(bookPatientAge) : undefined,
          gender: bookPatientGender,
          doctor_id: selectedWalkinDoctor.id,
          appointment_time: selectedWalkinDoctor.next_available_time,
          reason: bookReason.trim() || "Front desk walk-in consultation",
        });

        setBookingSuccessMsg(
          `Walk-in patient registered & checked-in successfully! Token: ${res.appointment.appointment_code} for ${res.appointment.patient_name} at ${res.appointment.assigned_time_formatted || selectedWalkinDoctor.next_available_time_formatted}`
        );
        loadDashboard();
        setBookPatientName("");
        setBookPatientPhone("");
        setBookPatientEmail("");
        setBookPatientAge("");
      } catch (err: any) {
        setBookingError(err.message || "Failed to register walk-in patient.");
      } finally {
        setSubmittingBooking(false);
      }
    } else {
      if (!bookDoctorId) {
        setBookingError("Please select a Consultant Physician.");
        return;
      }
      if (!bookDate || !selectedDateObj) {
        setBookingError("Please select an available appointment date for the selected physician.");
        return;
      }

      setSubmittingBooking(true);
      try {
        const res = await receptionApi.bookAppointment({
          full_name: bookPatientName.trim(),
          phone: bookPatientPhone.trim(),
          email: bookPatientEmail.trim() || undefined,
          age: bookPatientAge ? Number(bookPatientAge) : undefined,
          gender: bookPatientGender,
          doctor_id: bookDoctorId,
          appointment_date: bookDate,
          appointment_time: selectedDateObj.next_available_time,
          reason: bookReason.trim() || "Scheduled OPD consultation",
        });

        setBookingSuccessMsg(
          `Appointment scheduled & confirmed successfully! Code: ${res.appointment.appointment_code} for ${res.appointment.patient_name} on ${selectedDateObj.formatted_date || bookDate} at ${res.appointment.assigned_time_formatted || selectedDateObj.next_available_time_formatted}`
        );
        loadDashboard();
        setBookPatientName("");
        setBookPatientPhone("");
        setBookPatientEmail("");
        setBookPatientAge("");
      } catch (err: any) {
        setBookingError(err.message || "Failed to schedule appointment.");
      } finally {
        setSubmittingBooking(false);
      }
    }
  }

  // Open Patient 360 profile by ID, phone, or appointment/lab code
  async function openPatientProfile(identifier: string) {
    if (!identifier) return;
    setPatientProfileSearch(identifier);
    setPatientProfile(null);
    setPatientProfileError(null);
    setLoadingPatientProfile(true);
    setPatientModalOpen(true);

    try {
      const res = await receptionApi.patientDetails(identifier);
      setPatientProfile(res);
    } catch (err: any) {
      setPatientProfileError(err.message || "Failed to load patient records.");
    } finally {
      setLoadingPatientProfile(false);
    }
  }

  // Open Lab Report Lookup modal by tracking ID
  async function handleSearchLabReport(e?: React.FormEvent, customId?: string) {
    if (e) e.preventDefault();
    const idToSearch = (customId || labTrackingInput).trim();
    if (!idToSearch) return;

    setLabError(null);
    setLabBookingDetails(null);
    setLoadingLabDetails(true);
    setLabModalOpen(true);

    try {
      const res = await laboratoryApi.track(idToSearch);
      setLabBookingDetails(res.booking);
    } catch (err: any) {
      setLabError(err.message || "No laboratory report found for this Tracking ID.");
    } finally {
      setLoadingLabDetails(false);
    }
  }

  // Filter doctors for the status directory table
  const filteredDoctors = useMemo(() => {
    if (!data?.doctors) return [];
    return data.doctors.filter((doc) => {
      const matchesSearch =
        !doctorSearch.trim() ||
        doc.full_name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
        doc.specialization.toLowerCase().includes(doctorSearch.toLowerCase()) ||
        doc.department_name.toLowerCase().includes(doctorSearch.toLowerCase());

      const matchesDept = selectedDept === "all" || doc.department_name === selectedDept;

      return matchesSearch && matchesDept;
    });
  }, [data?.doctors, doctorSearch, selectedDept]);

  const availableDocsCount = useMemo(() => {
    if (!data?.doctors) return 0;
    return data.doctors.filter((d) => (d.current_status || "").includes("AVAILABLE")).length;
  }, [data?.doctors]);

  return (
    <div className="space-y-8">
      {/* Top Front Desk Header with Global Search */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Hospital Front Desk & Patient Services
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Front Desk Reception Portal
          </h1>
          <p className="text-xs text-slate-500">
            Specialist OPD availability, automatic appointment scheduling, patient intake, and diagnostic services.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setBookingError(null);
              setBookingSuccessMsg(null);
              setBookingMode("scheduled");
              setBookModalOpen(true);
            }}
            className="btn-primary inline-flex items-center gap-2 text-xs shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          SECTION 1: FOUR CORE ACTION CARDS
          1. BOOK APPOINTMENT
          2. DOCTOR AVAILABILITY
          3. PATIENT LOOKUP
          4. LAB REPORTS
      ============================================================ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Action 1: Book Appointment */}
        <button
          type="button"
          onClick={() => {
            setBookingError(null);
            setBookingSuccessMsg(null);
            setBookingMode("scheduled");
            setBookModalOpen(true);
          }}
          className="card group flex flex-col justify-between p-5 text-left border-l-4 border-l-teal-600 transition hover:shadow-md hover:border-teal-700 bg-white cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">
                Action 01
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 group-hover:bg-teal-700 group-hover:text-white transition">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <h3 className="mt-3 text-base font-extrabold text-teal-950">
              BOOK APPOINTMENT
            </h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Schedule patient consultation. Loads on-duty doctors and auto-assigns next consultation slot.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-teal-700 group-hover:text-teal-900">
            <span>Schedule Slot</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
          </div>
        </button>

        {/* Action 2: Doctor Status / Availability */}
        <a
          href="#doctor-availability"
          className="card group flex flex-col justify-between p-5 text-left border-l-4 border-l-emerald-600 transition hover:shadow-md hover:border-emerald-700 bg-white"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Action 02
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition">
                <Stethoscope className="h-5 w-5" />
              </div>
            </div>
            <h3 className="mt-3 text-base font-extrabold text-teal-950">
              DOCTOR AVAILABILITY
            </h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Live consultation shifts, on-duty physicians ({availableDocsCount} active), and OPD clinics.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:text-emerald-900">
            <span>Check Availability</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
          </div>
        </a>

        {/* Action 3: Patient Lookup */}
        <button
          type="button"
          onClick={() => {
            setPatientProfileError(null);
            setPatientModalOpen(true);
          }}
          className="card group flex flex-col justify-between p-5 text-left border-l-4 border-l-blue-600 transition hover:shadow-md hover:border-blue-700 bg-white cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                Action 03
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-700 group-hover:text-white transition">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>
            <h3 className="mt-3 text-base font-extrabold text-teal-950">
              PATIENT LOOKUP
            </h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Find complete patient profile, past visits, lab bookings, and medication records by phone or ID.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-blue-700 group-hover:text-blue-900">
            <span>Open Patient 360</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
          </div>
        </button>

        {/* Action 4: Lab Reports */}
        <Link
          to="/reception/laboratory"
          className="card group flex flex-col justify-between p-5 text-left border-l-4 border-l-purple-600 transition hover:shadow-md hover:border-purple-700 bg-white"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">
                Action 04
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 group-hover:bg-purple-700 group-hover:text-white transition">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <h3 className="mt-3 text-base font-extrabold text-teal-950">
              LAB REPORTS
            </h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Diagnostic test catalog, in-clinic and home collection test booking, and sample tracking.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-purple-700 group-hover:text-purple-900">
            <span>Laboratory Desk</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
          </div>
        </Link>
      </div>

      {/* ============================================================
          SECTION 2: LIVE METRICS & LAB SUMMARY
      ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today&apos;s Appointments</span>
          <div className="mt-2 text-2xl font-extrabold text-teal-950">
            {data?.stats?.total_today || 0}
          </div>
          <div className="mt-1 text-[11px] text-teal-700 font-semibold">
            {data?.stats?.checked_in_today || 0} Checked-In • {data?.stats?.confirmed_today || 0} Confirmed
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed Today</span>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600">
            {data?.stats?.completed_today || 0}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700 font-semibold">Consultations finished</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">On-Duty Physicians</span>
          <div className="mt-2 text-2xl font-extrabold text-blue-900">
            {availableDocsCount}
          </div>
          <div className="mt-1 text-[11px] text-blue-700 font-semibold">Active in OPD clinics</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Laboratory Reports</span>
          <div className="mt-2 text-2xl font-extrabold text-purple-900">
            {data?.labSummary?.total_reports || 0}
          </div>
          <div className="mt-1 text-[11px] text-purple-700 font-semibold">
            {data?.labSummary?.pending_reports || 0} Pending • {data?.labSummary?.completed_reports || 0} Ready
          </div>
        </div>
      </div>

      {/* ============================================================
          SECTION 3: TODAY'S APPOINTMENTS QUEUE
      ============================================================ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-700" />
              <h2 className="text-base font-extrabold text-teal-950">
                Today&apos;s Appointments {data?.queue?.length ? `(${data.queue.length})` : ""}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Patients scheduled or checked-in for consultation today ({todayStr}).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {data?.queue?.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <Calendar className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">No appointments scheduled for today.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">Token / Code</th>
                  <th className="py-3 px-3">Patient</th>
                  <th className="py-3 px-3">Physician</th>
                  <th className="py-3 px-3">Consultation Time</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {data?.queue?.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-teal-900">{item.appointment_code}</span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{item.patient_name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>{item.patient_phone}</span>
                        {item.patient_age && <span>• {item.patient_age} yrs</span>}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-teal-950">Dr. {item.doctor_name}</div>
                      <div className="text-[11px] text-slate-500">{item.department_name}</div>
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-800">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-teal-700" />
                        {item.appointment_time}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          item.status === "checked_in"
                            ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                            : item.status === "completed"
                            ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                            : item.status === "cancelled"
                            ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                            : "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {item.status.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {item.status === "confirmed" && (
                          <button
                            type="button"
                            onClick={() => handleCheckIn(item.id)}
                            className="rounded-lg bg-teal-800 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-teal-900 transition shadow-xs cursor-pointer"
                          >
                            Check In
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openPatientProfile(item.patient_phone || item.appointment_code)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 hover:text-teal-900 transition cursor-pointer"
                        >
                          View Patient
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ============================================================
          SECTION 4: DOCTOR STATUS & AVAILABILITY DIRECTORY
          "Which doctor is available right now?"
      ============================================================ */}
      <div id="doctor-availability" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-emerald-700" />
              <h2 className="text-base font-extrabold text-teal-950">
                Doctor Status & OPD Availability Directory
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live duty status across departments to instantly answer &quot;Which doctor is available right now?&quot;.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                placeholder="Search physician or clinic..."
                className="input-field pl-8.5 py-1.5 text-xs w-48 sm:w-60"
              />
            </div>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="input-field py-1.5 text-xs w-auto"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredDoctors.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No medical specialists match your search criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">Physician</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">OPD Availability / Shift</th>
                  <th className="py-3 px-3">Consultation Fee</th>
                  <th className="py-3 px-3">Current Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDoctors.map((doc: any) => {
                  const status = doc.current_status || "AVAILABLE / ON DUTY";
                  const isAvailable = status.includes("AVAILABLE");
                  const isBusy = status.includes("BUSY");

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-teal-950">{doc.full_name}</div>
                        <div className="text-[11px] text-slate-500">{doc.specialization}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-block rounded-md bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700 text-[11px]">
                          {doc.department_name}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-600 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {doc.shift_hours || "Shift info available"}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-teal-950">
                        Rs. {Number(doc.consultation_fee || 0).toLocaleString()}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isAvailable
                              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                              : isBusy
                              ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isAvailable
                                ? "bg-emerald-500 animate-pulse"
                                : isBusy
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setBookDoctorId(doc.id);
                            setBookingError(null);
                            setBookingSuccessMsg(null);
                            setBookingMode("scheduled");
                            setBookModalOpen(true);
                          }}
                          className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-900 hover:bg-teal-100 transition cursor-pointer"
                        >
                          Book Appointment
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ============================================================
          MODAL 1: BOOK APPOINTMENT / WALK-IN REGISTRATION
          Enforces New Correct Workflow:
          1. Scheduled:
             - Upcoming valid dates dropdown
             - Loads ONLY doctors available on that date
             - Automatically assigns next consultation time
             - Read-only display of consultation time (no manual input/buttons)
             - Confirms immediately
          2. Walk-In:
             - Date locked to TODAY ONLY (no date picker)
             - Shows only doctors available today
             - Automatically assigns next queue time
             - Auto-confirms & checks in immediately
      ============================================================ */}
      {bookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-800 text-white">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-teal-950">
                    {bookingMode === "walkin" ? "Front Desk Walk-In Intake" : "Schedule Doctor Appointment"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {bookingMode === "walkin"
                      ? "Immediate walk-in queue token and check-in for arriving patient today."
                      : "Schedule consultation slot with an on-duty specialist."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBookModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mode Selector: Scheduled Appointment vs Walk-In */}
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setBookingMode("scheduled");
                  setBookingError(null);
                  setBookingSuccessMsg(null);
                }}
                className={`rounded-lg py-2 font-bold transition cursor-pointer ${
                  bookingMode === "scheduled"
                    ? "bg-white text-teal-950 shadow-xs ring-1 ring-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Scheduled Appointment
              </button>
              <button
                type="button"
                onClick={() => {
                  setBookingMode("walkin");
                  setBookingError(null);
                  setBookingSuccessMsg(null);
                  setBookReason("Front desk walk-in consultation");
                }}
                className={`rounded-lg py-2 font-bold transition cursor-pointer ${
                  bookingMode === "walkin"
                    ? "bg-white text-teal-950 shadow-xs ring-1 ring-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Walk-In Registration (Today Only)
              </button>
            </div>

            {bookingSuccessMsg && (
              <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 ring-1 ring-emerald-200 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{bookingSuccessMsg}</span>
              </div>
            )}

            {bookingError && (
              <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 ring-1 ring-rose-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleBookSubmit} className="mt-4 space-y-4 text-xs">
              {/* ============================================================
                  1. PATIENT INFORMATION
              ============================================================ */}
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200/80">
                  <User className="h-3.5 w-3.5 text-teal-800" />
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Patient Information
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700">Patient Full Name *</label>
                    <input
                      type="text"
                      required
                      value={bookPatientName}
                      onChange={(e) => setBookPatientName(e.target.value)}
                      placeholder="e.g. Faraz Ali"
                      className="input-field mt-1"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700">Patient Phone *</label>
                    <input
                      type="text"
                      required
                      value={bookPatientPhone}
                      onChange={(e) => setBookPatientPhone(e.target.value)}
                      placeholder="03001234567"
                      className="input-field mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700">Age</label>
                    <input
                      type="number"
                      value={bookPatientAge}
                      onChange={(e) => setBookPatientAge(e.target.value)}
                      placeholder="e.g. 28"
                      className="input-field mt-1"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700">Gender</label>
                    <select
                      value={bookPatientGender}
                      onChange={(e) => setBookPatientGender(e.target.value)}
                      className="input-field mt-1"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700">Email (Confirmation)</label>
                    <input
                      type="email"
                      value={bookPatientEmail}
                      onChange={(e) => setBookPatientEmail(e.target.value)}
                      placeholder="patient@example.com"
                      className="input-field mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* ============================================================
                  2. CONSULTANT PHYSICIAN (FIRST SCHEDULING FIELD)
              ============================================================ */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800">
                    {bookingMode === "walkin" ? "Consultant Physician (On Duty Today) *" : "Consultant Physician *"}
                  </label>
                  {bookingMode === "scheduled" && loadingDoctorDates && (
                    <span className="text-[10px] text-teal-700 font-semibold flex items-center gap-1">
                      <div className="h-2.5 w-2.5 animate-spin rounded-full border border-teal-700 border-t-transparent" />
                      Loading doctor schedule...
                    </span>
                  )}
                  {bookingMode === "walkin" && loadingDoctorsToday && (
                    <span className="text-[10px] text-teal-700 font-semibold flex items-center gap-1">
                      <div className="h-2.5 w-2.5 animate-spin rounded-full border border-teal-700 border-t-transparent" />
                      Checking on-duty doctors...
                    </span>
                  )}
                </div>

                {bookingMode === "scheduled" ? (
                  <select
                    value={bookDoctorId}
                    onChange={(e) => setBookDoctorId(e.target.value)}
                    required
                    className="input-field mt-1 font-semibold text-slate-900"
                  >
                    <option value="" disabled>
                      -- Select a Consultant Physician --
                    </option>
                    {activeDoctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.full_name} — {doc.specialization || "Physician"} ({doc.department_name || "OPD"}) • Fee: Rs. {Number(doc.consultation_fee || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                ) : (
                  loadingDoctorsToday ? (
                    <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center text-xs text-slate-500">
                      Checking on-duty doctors for today...
                    </div>
                  ) : availableDoctorsToday.length === 0 ? (
                    <div className="mt-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-amber-700" />
                        No doctors on duty today
                      </p>
                      <p className="text-[11px] text-amber-800">
                        There are currently no scheduled physicians with open consultation slots today ({todayStr}). Switch to Scheduled Appointment to book future dates.
                      </p>
                    </div>
                  ) : (
                    <select
                      value={bookDoctorId}
                      onChange={(e) => setBookDoctorId(e.target.value)}
                      required
                      className="input-field mt-1 font-semibold text-slate-900"
                    >
                      {availableDoctorsToday.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.full_name} ({doc.department_name || "OPD"}) — Shift: {doc.shift?.label || "Daytime"} • Next Slot: {doc.next_available_time_formatted || doc.next_available_time}
                        </option>
                      ))}
                    </select>
                  )
                )}
              </div>

              {/* ============================================================
                  3. APPOINTMENT DATE (DOCTOR-DEPENDENT)
              ============================================================ */}
              <div>
                <label className="block font-bold text-slate-800">
                  {bookingMode === "walkin" ? "Intake Date" : "Appointment Date *"}
                </label>

                {bookingMode === "walkin" ? (
                  <div className="mt-1 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-xs font-semibold text-emerald-900">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-700" />
                      Locked to Today: <strong className="font-mono">{todayStr}</strong>
                    </span>
                    <span className="rounded-full bg-emerald-200/80 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                      Walk-In Only
                    </span>
                  </div>
                ) : (
                  !bookDoctorId ? (
                    <select disabled className="input-field mt-1 text-slate-400 bg-slate-50 cursor-not-allowed">
                      <option>First select a Consultant Physician above</option>
                    </select>
                  ) : loadingDoctorDates ? (
                    <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center text-xs text-slate-500">
                      Fetching available consultation dates for selected doctor...
                    </div>
                  ) : doctorAvailableDates.length === 0 ? (
                    <div className="mt-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-amber-700" />
                        No upcoming shifts scheduled
                      </p>
                      <p className="text-[11px] text-amber-800">
                        This doctor currently has no upcoming OPD consultation shifts or available slots. Please choose another doctor.
                      </p>
                    </div>
                  ) : (
                    <select
                      value={bookDate}
                      onChange={(e) => setBookDate(e.target.value)}
                      required
                      className="input-field mt-1 font-semibold text-slate-900"
                    >
                      {doctorAvailableDates.map((d) => (
                        <option key={d.date} value={d.date}>
                          {d.formatted_date} ({d.day}) — Shift: {d.shift?.label || "Daytime"} • {d.available_slots_count} slots open
                        </option>
                      ))}
                    </select>
                  )
                )}
              </div>

              {/* ============================================================
                  4. AUTO-ASSIGNED CONSULTATION TIME (READ-ONLY)
              ============================================================ */}
              {bookingMode === "scheduled" && selectedDateObj && (
                <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-teal-700" />
                      Auto-Assigned Consultation Time
                    </span>
                    <span className="rounded-full bg-teal-200/80 px-2.5 py-0.5 text-[10px] font-extrabold text-teal-950 uppercase">
                      Next Available Slot
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-teal-200/80">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                        Assigned Consultation Slot
                      </span>
                      <span className="text-base font-extrabold text-teal-900">
                        {selectedDateObj.next_available_time_formatted || selectedDateObj.next_available_time}
                      </span>
                    </div>

                    <div className="text-right text-[11px] text-slate-500">
                      <div>Shift: <strong className="text-slate-800">{selectedDateObj.shift?.label}</strong></div>
                      <div>Slots Open: <strong className="text-teal-800">{selectedDateObj.available_slots_count}</strong></div>
                    </div>
                  </div>

                  <p className="text-[10px] text-teal-800 leading-normal">
                    The system automatically assigns the earliest unbooked slot on this date. No manual time selection required.
                  </p>
                </div>
              )}

              {bookingMode === "walkin" && selectedWalkinDoctor && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-emerald-700" />
                      Assigned Walk-In Queue Slot
                    </span>
                    <span className="rounded-full bg-emerald-200/80 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-950 uppercase">
                      Walk-In Token
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-emerald-200/80">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                        Queue Consultation Time
                      </span>
                      <span className="text-base font-extrabold text-emerald-900">
                        {selectedWalkinDoctor.next_available_time_formatted || selectedWalkinDoctor.next_available_time}
                      </span>
                    </div>

                    <div className="text-right text-[11px] text-slate-500">
                      <div>Shift: <strong className="text-slate-800">{selectedWalkinDoctor.shift?.label}</strong></div>
                      <div>Slots Open: <strong className="text-emerald-800">{selectedWalkinDoctor.available_slots_count}</strong></div>
                    </div>
                  </div>

                  <p className="text-[10px] text-emerald-800 leading-normal">
                    Walk-in patient will receive an immediate consultation queue token and be checked in automatically.
                  </p>
                </div>
              )}

              {/* ============================================================
                  5. CHIEF COMPLAINT / REASON
              ============================================================ */}
              <div>
                <label className="block font-bold text-slate-700">Chief Complaint / Reason</label>
                <input
                  type="text"
                  value={bookReason}
                  onChange={(e) => setBookReason(e.target.value)}
                  placeholder={bookingMode === "walkin" ? "Walk-in consultation" : "e.g. Routine check-up, Fever"}
                  className="input-field mt-1"
                />
              </div>

              {/* ============================================================
                  6. SUBMIT BUTTON
              ============================================================ */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBookModalOpen(false)}
                  className="btn-secondary py-2 px-4 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submittingBooking ||
                    (bookingMode === "scheduled" ? (!bookDoctorId || !selectedDateObj) : (!bookDoctorId || !selectedWalkinDoctor))
                  }
                  className="btn-primary py-2 px-5 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {submittingBooking
                    ? "Processing..."
                    : bookingMode === "walkin"
                    ? "Issue Walk-In Token & Check-In"
                    : "Confirm & Issue Appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 2: PATIENT 360° COMPREHENSIVE PROFILE
      ============================================================ */}
      {patientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-white">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-teal-950">
                    Patient 360° Operational Record
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cross-entity hospital history: OPD visits, diagnostic pathology, and pharmacy.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPatientModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Search bar inside modal */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                openPatientProfile(patientProfileSearch);
              }}
              className="mt-4 flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={patientProfileSearch}
                  onChange={(e) => setPatientProfileSearch(e.target.value)}
                  placeholder="Enter Phone, Patient Code, Appointment ID (APT-...), or Lab ID..."
                  className="input-field pl-8.5 py-2 text-xs w-full"
                />
              </div>
              <button
                type="submit"
                disabled={loadingPatientProfile}
                className="btn-primary py-2 px-4 text-xs font-bold shrink-0 cursor-pointer"
              >
                {loadingPatientProfile ? "Searching..." : "Lookup"}
              </button>
            </form>

            {patientProfileError && (
              <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 ring-1 ring-rose-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{patientProfileError}</span>
              </div>
            )}

            {loadingPatientProfile ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent mb-2" />
                <p>Loading patient hospital history...</p>
              </div>
            ) : patientProfile ? (
              <div className="mt-5 space-y-5 text-xs">
                {/* Patient Demographics Card */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-extrabold text-teal-950">
                        {patientProfile.patient?.full_name}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Patient Identifier: <span className="font-mono font-bold text-teal-800">{patientProfile.patient?.patient_code || "N/A"}</span>
                      </p>
                    </div>
                    <span className="rounded-full bg-teal-100 px-2.5 py-0.5 font-bold text-teal-900 text-[10px]">
                      Registered Patient
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-400 block font-semibold">Phone:</span>
                      <span className="font-bold text-slate-800">{patientProfile.patient?.phone || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Email:</span>
                      <span className="font-bold text-slate-800">{patientProfile.patient?.email || "None"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Age / Gender:</span>
                      <span className="font-bold text-slate-800">
                        {patientProfile.patient?.age ? `${patientProfile.patient.age} yrs` : "--"} • {patientProfile.patient?.gender || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Registered:</span>
                      <span className="font-bold text-slate-800">
                        {patientProfile.patient?.created_at ? String(patientProfile.patient.created_at).slice(0, 10) : "Recent"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Doctor Appointments */}
                <div>
                  <h4 className="font-bold text-teal-950 mb-2 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-teal-700" />
                    Doctor Consultations ({patientProfile.appointments?.length || 0})
                  </h4>
                  {patientProfile.appointments?.length === 0 ? (
                    <p className="text-slate-400 text-[11px] italic">No consultations on file.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                      {patientProfile.appointments.map((a: any) => (
                        <div key={a.id} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900">
                              Dr. {a.doctor_name} ({a.department_name})
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Code: <span className="font-mono font-bold text-teal-900">{a.appointment_code}</span> • Date: {String(a.appointment_date).slice(0, 10)} at {a.appointment_time}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">Rs. {a.consultation_fee}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                              {a.status.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Laboratory Bookings & Results */}
                <div>
                  <h4 className="font-bold text-teal-950 mb-2 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-teal-700" />
                    Laboratory Diagnostic Bookings ({patientProfile.labBookings?.length || 0})
                  </h4>
                  {patientProfile.labBookings?.length === 0 ? (
                    <p className="text-slate-400 text-[11px] italic">No laboratory bookings recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {patientProfile.labBookings.map((b: any) => (
                        <div key={b.id} className="p-3 bg-white border border-slate-100 rounded-xl space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <div>
                              <span className="font-mono font-bold text-teal-800">{b.tracking_id}</span>
                              <span className="text-[10px] text-slate-400 block">Date: {String(b.booking_date).slice(0, 10)}</span>
                            </div>
                            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase text-teal-800">
                              {b.status.replace("_", " ")}
                            </span>
                          </div>
                          {b.items?.map((it: any) => (
                            <div key={it.id || it.test_name} className="flex items-center justify-between text-[11px]">
                              <span>{it.test_name}</span>
                              <span className="font-semibold text-slate-700">
                                {it.result_value ? `${it.result_value} ${it.unit || ""}` : "Pending Analysis"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 3: LAB REPORT LOOKUP (Tracking ID)
      ============================================================ */}
      {labModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-800 text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-teal-950">Diagnostic Lab Report Lookup</h3>
                  <p className="text-[11px] text-slate-500">
                    Enter patient&apos;s Laboratory Tracking ID to view verification status and test values.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLabModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSearchLabReport} className="mt-4 flex gap-2">
              <input
                type="text"
                required
                value={labTrackingInput}
                onChange={(e) => setLabTrackingInput(e.target.value)}
                placeholder="Enter Tracking ID (e.g. LAB-2026-123456)..."
                className="input-field py-2 text-xs flex-1"
              />
              <button
                type="submit"
                disabled={loadingLabDetails}
                className="btn-primary py-2 px-4 text-xs font-bold shrink-0 cursor-pointer"
              >
                {loadingLabDetails ? "Searching..." : "Track"}
              </button>
            </form>

            {labError && (
              <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 ring-1 ring-rose-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{labError}</span>
              </div>
            )}

            {labBookingDetails && (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{labBookingDetails.patient_name}</span>
                    <span className="block text-[11px] text-slate-500">Phone: {labBookingDetails.patient_phone}</span>
                  </div>
                  <span className="rounded-full bg-teal-100 px-2.5 py-0.5 font-extrabold text-teal-900 text-[10px] uppercase">
                    {labBookingDetails.status.replace("_", " ")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block font-semibold">Tracking ID:</span>
                    <span className="font-mono font-bold text-teal-800">{labBookingDetails.tracking_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Service Mode:</span>
                    <span className="font-bold text-slate-800 capitalize">
                      {labBookingDetails.service_type === "home_service" ? "Home Collection" : "In-Clinic Lab"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Booking Date:</span>
                    <span className="font-bold text-slate-800">
                      {String(labBookingDetails.booking_date).slice(0, 10)} {labBookingDetails.booking_time || ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Total Amount:</span>
                    <span className="font-bold text-teal-950">Rs. {Number(labBookingDetails.total_amount).toLocaleString()}</span>
                  </div>
                </div>

                {labBookingDetails.items && labBookingDetails.items.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">Investigation Items:</span>
                    <div className="space-y-1.5">
                      {labBookingDetails.items.map((it: any) => (
                        <div key={it.id || it.test_name} className="flex items-center justify-between rounded-lg bg-white p-2 border border-slate-200">
                          <div>
                            <span className="font-semibold text-slate-800">{it.test_name}</span>
                            {it.result_value && (
                              <span className="block text-[11px] text-teal-800 font-bold">
                                Result: {it.result_value} {it.unit || ""} (Ref: {it.normal_range || "N/A"})
                              </span>
                            )}
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700 uppercase">
                            {it.result_status || "pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
