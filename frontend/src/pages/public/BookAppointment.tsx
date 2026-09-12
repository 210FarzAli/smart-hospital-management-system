import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  departmentsApi,
  doctorsApi,
  appointmentsApi,
} from "../../lib/apiClient";
import type { Department, Doctor } from "../../lib/types";
import { getPatientFriendlyDepartmentName } from "../../lib/departmentUtils";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Stethoscope,
  Hospital,
  ArrowRight,
} from "../../components/icons/Icons";

type DoctorSchedule = {
  day: string;
  start_time: string;
  end_time: string;
};

type DoctorShift = {
  day: string;
  start_time: string;
  end_time: string;
  label: string;
};

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(dateString: string) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string) {
  if (!time) return "";
  const [hoursString, minutesString] = time.split(":");
  const hours = Number(hoursString);
  const minutes = Number(minutesString);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return time;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getUpcomingAvailableDates(doctor: Doctor) {
  const schedule = (doctor.availability || []) as DoctorSchedule[];
  const availableDays = new Set(
    schedule.map((item) => String(item.day).trim())
  );
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dates: string[] = [];
  const today = new Date();

  // Next 90 calendar days
  for (let i = 0; i < 90; i++) {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + i
    );
    const dayName = dayNames[date.getDay()];
    if (availableDays.has(dayName)) {
      dates.push(formatDateForInput(date));
    }
  }

  return dates;
}

export default function BookAppointment() {
  const [searchParams] = useSearchParams();
  const initialDoctorId = searchParams.get("doctorId") ?? "";
  const initialDate = searchParams.get("date") ?? "";
  const initialTime = searchParams.get("time") ?? "";

  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [departmentId, setDepartmentId] = useState("");
  const [doctorId, setDoctorId] = useState(initialDoctorId);
  const [date, setDate] = useState(initialDate);
  const [shift, setShift] = useState<DoctorShift | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [reason, setReason] = useState("");

  // Patient details
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [status, setStatus] = useState<
    "idle" | "submitting" | "done" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmation, setConfirmation] = useState<string | null>(null);

  // Selected doctor object for the live summary
  const selectedDoctor = doctors.find((d) => d.id === doctorId);
  const selectedDept = departments.find((d) => d.id === departmentId);

  // Load departments
  useEffect(() => {
    departmentsApi
      .list()
      .then(setDepartments)
      .catch(console.error);
  }, []);

  // If doctorId is passed in URL, auto-resolve department and doctor list
  useEffect(() => {
    if (!initialDoctorId) return;
    doctorsApi
      .get(initialDoctorId)
      .then((doc) => {
        if (doc && doc.department_id) {
          setDepartmentId(doc.department_id);
          setDoctorId(doc.id);
          if (initialDate) {
            setDate(initialDate);
          }
        }
      })
      .catch(console.error);
  }, [initialDoctorId, initialDate]);

  // Load doctors when department changes
  useEffect(() => {
    if (!departmentId) {
      setDoctors([]);
      setDoctorId("");
      setDate("");
      setShift(null);
      setAvailableDates([]);
      return;
    }

    doctorsApi
      .list({ departmentId })
      .then((res) => {
        setDoctors(res);
        // If the preselected doctor is in this department, keep them
        if (doctorId && !res.some((d) => d.id === doctorId)) {
          setDoctorId("");
          setDate("");
          setShift(null);
          setAvailableDates([]);
        }
      })
      .catch(console.error);
  }, [departmentId]);

  // Generate dates when doctor selection changes
  useEffect(() => {
    if (!doctorId) {
      setDate("");
      setShift(null);
      setAvailableDates([]);
      return;
    }

    const currentDoc = doctors.find((d) => d.id === doctorId);
    if (!currentDoc) {
      setAvailableDates([]);
      return;
    }

    const dates = getUpcomingAvailableDates(currentDoc);
    setAvailableDates(dates);

    if (initialDate && (dates.includes(initialDate) || dates.length > 0)) {
      setDate(initialDate);
    } else if (date && !dates.includes(date)) {
      setDate("");
      setShift(null);
    }
  }, [doctorId, doctors, initialDate]);

  // Load shift availability for the chosen date
  useEffect(() => {
    setShift(null);

    if (!doctorId || !date) {
      return;
    }

    setAvailabilityLoading(true);

    appointmentsApi
      .availability(doctorId, date)
      .then((result) => {
        const availableShift = result.shift;
        if (
          result.available &&
          availableShift &&
          availableShift.start_time &&
          availableShift.end_time
        ) {
          setShift({
            day: availableShift.day,
            start_time: availableShift.start_time,
            end_time: availableShift.end_time,
            label: `${formatTime(availableShift.start_time)} – ${formatTime(
              availableShift.end_time
            )}`,
          });
        } else {
          setShift(null);
        }
      })
      .catch((error) => {
        console.error(error);
        setShift(null);
      })
      .finally(() => {
        setAvailabilityLoading(false);
      });
  }, [doctorId, date]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (!doctorId || !date || !shift) {
      setErrorMessage("Please select a doctor, available date, and shift.");
      setStatus("error");
      return;
    }

    const patientAge = Number(age);
    if (
      !Number.isInteger(patientAge) ||
      patientAge < 1 ||
      patientAge > 120
    ) {
      setErrorMessage("Please enter a valid age between 1 and 120.");
      setStatus("error");
      return;
    }

    setStatus("submitting");

    try {
      const { appointment } = await appointmentsApi.book({
        full_name: fullName,
        age: patientAge,
        phone,
        email,
        doctor_id: doctorId,
        appointment_date: date,
        appointment_time: shift.start_time,
        reason,
      });

      setConfirmation(appointment.appointment_code);
      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrorMessage(
        "Unable to complete booking. Please verify your details or contact our emergency reception."
      );
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="min-h-[80vh] bg-slate-50/50 py-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="card overflow-hidden border-teal-200 shadow-xl print:border-none print:shadow-none">
            {/* Confirmation Header */}
            <div className="bg-gradient-to-r from-teal-900 to-teal-800 p-8 text-center text-white">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-700/60 ring-8 ring-teal-500/20 backdrop-blur">
                <CheckCircle className="h-9 w-9 text-emerald-300" />
              </div>
              <span className="inline-block rounded-full bg-teal-700/60 px-3 py-1 text-xs font-semibold tracking-wider text-teal-200 uppercase">
                Appointment Confirmed
              </span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                OPD Visit Booked Successfully
              </h1>
              <p className="mt-2 text-sm text-teal-100">
                A confirmation has been recorded and an email notification sent to{" "}
                <span className="font-semibold text-white">{email}</span>.
              </p>
            </div>

            {/* Token Badge */}
            <div className="border-b border-dashed border-slate-200 bg-teal-50/60 px-8 py-6 text-center">
              <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Appointment Reference Code
              </span>
              <div className="mt-1 font-mono text-3xl font-extrabold tracking-widest text-teal-950 sm:text-4xl">
                {confirmation}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Please show this token code at the OPD reception counter upon arrival.
              </p>
            </div>

            {/* Appointment Details Grid */}
            <div className="space-y-4 p-8">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Stethoscope className="h-4 w-4 text-teal-700" />
                    Consulting Specialist
                  </div>
                  <div className="mt-1 font-semibold text-teal-950">
                    {selectedDoctor?.full_name || "Assigned Specialist"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {selectedDoctor?.specialization || (selectedDept?.name ? getPatientFriendlyDepartmentName(selectedDept.name) : "")}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Calendar className="h-4 w-4 text-teal-700" />
                    Date & OPD Shift
                  </div>
                  <div className="mt-1 font-semibold text-teal-950">
                    {formatDateForDisplay(date)}
                  </div>
                  <div className="text-xs font-medium text-teal-800">
                    Shift: {shift?.label}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <User className="h-4 w-4 text-teal-700" />
                    Patient Details
                  </div>
                  <div className="mt-1 font-semibold text-teal-950">
                    {fullName} ({age} yrs)
                  </div>
                  <div className="text-xs text-slate-500">{phone}</div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Hospital className="h-4 w-4 text-teal-700" />
                    OPD Consultation Fee
                  </div>
                  <div className="mt-1 font-bold text-teal-950">
                    Rs. {Number(selectedDoctor?.consultation_fee || 0).toLocaleString()}
                  </div>
                  <div className="mt-0.5 text-xs font-semibold text-emerald-700">
                    Payment: Pay Physically at Reception
                  </div>
                  <div className="text-[11px] text-slate-500">No online payment required</div>
                </div>
              </div>

              {reason && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="text-xs font-medium text-slate-500">Reason for Visit</div>
                  <p className="mt-1 text-sm text-slate-700">{reason}</p>
                </div>
              )}

              {/* Arrival Guidelines */}
              <div className="rounded-xl bg-amber-50/70 p-4 text-xs text-amber-900 ring-1 ring-amber-200/60">
                <div className="flex items-center gap-2 font-semibold">
                  <Clock className="h-4 w-4 text-amber-700" />
                  Important OPD Arrival Notice
                </div>
                <p className="mt-1 text-amber-800">
                  This booking registers you for the doctor's working shift. OPD tokens are called sequentially. Please arrive at least 15 minutes before the shift start time and carry any prior diagnostic reports.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-4 sm:flex-row print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-outline flex-1 text-center"
                >
                  Print / Save Pass
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    setDate("");
                    setShift(null);
                    setFullName("");
                    setAge("");
                    setPhone("");
                    setEmail("");
                    setReason("");
                    setConfirmation(null);
                  }}
                  className="btn-primary flex-1 text-center"
                >
                  Book Another Visit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3.5 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Seamless OPD Registration • No Account Required
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-teal-950 sm:text-4xl">
            Book an Outpatient Consultation
          </h1>
          <p className="mt-2 max-w-2xl text-base text-slate-600">
            Select a specialist, choose an available shift, and secure your hospital consultation token in under two minutes.
          </p>
        </div>

        {/* Two-Column Grid: Form & Live Summary */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Main Form Column */}
          <div className="lg:col-span-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Department & Doctor */}
              <div className="card overflow-hidden p-6 sm:p-7">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-teal-950">
                      1. Select Department & Doctor
                    </h2>
                    <p className="text-xs text-slate-500">
                      Choose the clinical specialty and consulting physician
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                      Clinical Department <span className="text-rose-500">*</span>
                    </label>
                    <select
                      className="input-field mt-1.5"
                      required
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                    >
                      <option value="">Choose Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {getPatientFriendlyDepartmentName(dept.name)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                      Specialist Physician <span className="text-rose-500">*</span>
                    </label>
                    <select
                      className="input-field mt-1.5"
                      required
                      value={doctorId}
                      disabled={!departmentId || doctors.length === 0}
                      onChange={(e) => setDoctorId(e.target.value)}
                    >
                      <option value="">
                        {!departmentId
                          ? "Select department first"
                          : doctors.length === 0
                          ? "No active doctors found"
                          : "Choose Doctor"}
                      </option>
                      {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.full_name} — {doc.specialization}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedDoctor && (
                  <div className="mt-4 flex flex-wrap items-center justify-between rounded-xl bg-teal-50/60 p-3 text-xs text-teal-950 ring-1 ring-teal-100">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                      OPD Consultation Fee:{" "}
                      <span className="font-bold">
                        Rs. {Number(selectedDoctor.consultation_fee || 0).toLocaleString()}
                      </span>
                      <span className="ml-1 font-semibold text-emerald-700">
                        • Pay Physically at Reception (No online payment)
                      </span>
                    </div>
                    {selectedDoctor.qualification && (
                      <span className="text-slate-600">
                        Qualifications: {selectedDoctor.qualification}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Date & Shift */}
              <div className="card overflow-hidden p-6 sm:p-7">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-teal-950">
                      2. Date & OPD Shift
                    </h2>
                    <p className="text-xs text-slate-500">
                      OPD appointments cover the doctor's scheduled shift
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                      Appointment Date <span className="text-rose-500">*</span>
                    </label>
                    <select
                      className="input-field mt-1.5"
                      required
                      value={date}
                      disabled={!doctorId || availableDates.length === 0}
                      onChange={(e) => setDate(e.target.value)}
                    >
                      <option value="">
                        {!doctorId
                          ? "Select a doctor first"
                          : availableDates.length === 0
                          ? "No scheduled shift days"
                          : "Select available date"}
                      </option>
                      {availableDates.map((availDate) => (
                        <option key={availDate} value={availDate}>
                          {formatDateForDisplay(availDate)}
                        </option>
                      ))}
                    </select>
                    {doctorId && availableDates.length === 0 && (
                      <p className="mt-1.5 text-xs text-amber-700">
                        This doctor does not have any OPD shifts configured.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                      Doctor's OPD Shift
                    </label>
                    <div className="input-field mt-1.5 flex min-h-[42px] items-center bg-slate-50 font-medium">
                      {availabilityLoading ? (
                        <span className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
                          Checking shift availability...
                        </span>
                      ) : !date ? (
                        <span className="text-xs text-slate-400">Select date first</span>
                      ) : shift ? (
                        <span className="flex items-center gap-2 text-sm font-bold text-teal-950">
                          <Clock className="h-4 w-4 text-teal-700" />
                          {shift.label}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700">
                          Doctor is unavailable on this date
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {shift && (
                  <div className="mt-4 rounded-xl bg-teal-50/50 p-3 text-xs text-teal-900 ring-1 ring-teal-200/60">
                    <p>
                      <span className="font-bold">Shift Policy:</span> Your booking confirms your OPD token for the doctor's{" "}
                      <span className="font-semibold">{shift.label}</span> shift on{" "}
                      <span className="font-semibold">{formatDateForDisplay(date)}</span>. Patients are seen in order of token issuance.
                    </p>
                  </div>
                )}
              </div>

              {/* Step 3: Patient Information */}
              <div className="card overflow-hidden p-6 sm:p-7">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-teal-950">
                      3. Patient Information
                    </h2>
                    <p className="text-xs text-slate-500">
                      Accurate contact details ensure smooth token issuance
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative mt-1.5">
                        <User className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Tariq Mehmood"
                          className="input-field pl-9"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                        Age (Years) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        required
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="Age"
                        className="input-field mt-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                        Mobile Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative mt-1.5">
                        <Phone className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0300-1234567"
                          className="input-field pl-9"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative mt-1.5">
                        <Mail className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="patient@example.com"
                          className="input-field pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                      Symptoms / Reason for Visit (Optional)
                    </label>
                    <div className="relative mt-1.5">
                      <FileText className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
                      <textarea
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Briefly describe what symptoms you are experiencing..."
                        className="input-field pl-9"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {status === "error" && (
                <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  <div>
                    <p className="font-semibold">Booking could not be processed</p>
                    <p className="mt-0.5 text-xs text-rose-700">
                      {errorMessage ||
                        "Please verify your inputs and ensure an active shift is selected."}
                    </p>
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={status === "submitting" || !doctorId || !date || !shift}
                className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-base shadow-lg shadow-teal-900/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "submitting" ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Confirming Reservation...
                  </>
                ) : (
                  <>
                    Confirm OPD Appointment
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Summary & Help Sidebar */}
          <div className="space-y-6 lg:col-span-4">
            {/* Live Summary Card */}
            <div className="card overflow-hidden p-6">
              <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                Appointment Summary
              </h3>

              <div className="mt-4 space-y-3.5 divide-y divide-slate-100 text-sm">
                <div className="pt-2">
                  <span className="text-xs text-slate-500">Department</span>
                  <div className="font-semibold text-teal-950">
                    {selectedDept?.name ? getPatientFriendlyDepartmentName(selectedDept.name) : "Not selected"}
                  </div>
                </div>

                <div className="pt-3">
                  <span className="text-xs text-slate-500">Doctor</span>
                  <div className="font-semibold text-teal-950">
                    {selectedDoctor?.full_name || "Not selected"}
                  </div>
                  {selectedDoctor?.specialization && (
                    <div className="text-xs text-slate-500">
                      {selectedDoctor.specialization}
                    </div>
                  )}
                </div>

                <div className="pt-3">
                  <span className="text-xs text-slate-500">Date</span>
                  <div className="font-semibold text-teal-950">
                    {date ? formatDateForDisplay(date) : "Not selected"}
                  </div>
                </div>

                <div className="pt-3">
                  <span className="text-xs text-slate-500">Shift</span>
                  <div className="font-semibold text-teal-950">
                    {shift?.label || "Pending date selection"}
                  </div>
                </div>

                <div className="flex flex-col gap-1 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">OPD Consultation Fee</span>
                    <span className="font-bold text-teal-950">
                      Rs. {Number(selectedDoctor?.consultation_fee || 0).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700">
                    Payment: Pay Physically at Reception
                  </span>
                </div>
              </div>
            </div>

            {/* Hospital OPD Protocols */}
            <div className="card space-y-3 p-6 text-xs text-slate-600">
              <h4 className="flex items-center gap-2 font-bold text-teal-950">
                <ShieldCheck className="h-4 w-4 text-teal-700" />
                OPD Visit Guidelines
              </h4>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                  <span>Please bring your CNIC or photo ID card.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                  <span>Bring previous prescriptions and diagnostic reports.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                  <span>OPD tokens are serviced in order of physical check-in at the desk.</span>
                </li>
              </ul>
            </div>

            {/* Emergency Notice */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 text-xs text-rose-900">
              <p className="font-bold text-rose-950">Medical Emergency?</p>
              <p className="mt-1 text-rose-800">
                Do not book an OPD appointment for critical conditions. Proceed immediately to our 24/7 Emergency Trauma Centre or call <span className="font-bold text-rose-950">(051) 111-222-333</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}