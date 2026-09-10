import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  departmentsApi,
  doctorsApi,
  appointmentsApi,
} from "../../lib/apiClient";
import type { Department, Doctor } from "../../lib/types";

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

  // Show the next 90 calendar days.
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

  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [departmentId, setDepartmentId] = useState("");
  const [doctorId, setDoctorId] = useState(
    searchParams.get("doctorId") ?? ""
  );

  const [date, setDate] = useState("");

  // The patient selects a doctor's shift, NOT an exact consultation time.
  const [shift, setShift] = useState<DoctorShift | null>(null);

  const [availableDates, setAvailableDates] = useState<string[]>([]);

  const [availabilityLoading, setAvailabilityLoading] =
    useState(false);

  const [reason, setReason] = useState("");

  // Patient details
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [status, setStatus] = useState<
    "idle" | "submitting" | "done" | "error"
  >("idle");

  const [confirmation, setConfirmation] = useState<string | null>(
    null
  );

  // Load departments
  useEffect(() => {
    departmentsApi
      .list()
      .then(setDepartments)
      .catch(console.error);
  }, []);

  // Load doctors when department changes
  useEffect(() => {
    setDoctors([]);
    setDoctorId("");
    setDate("");
    setShift(null);
    setAvailableDates([]);

    if (!departmentId) {
      return;
    }

    doctorsApi
      .list({ departmentId })
      .then(setDoctors)
      .catch(console.error);
  }, [departmentId]);

  // Generate dates on which the selected doctor normally works
  useEffect(() => {
    setDate("");
    setShift(null);

    if (!doctorId) {
      setAvailableDates([]);
      return;
    }

    const selectedDoctor = doctors.find(
      (doctor) => doctor.id === doctorId
    );

    if (!selectedDoctor) {
      setAvailableDates([]);
      return;
    }

    const dates = getUpcomingAvailableDates(selectedDoctor);

    setAvailableDates(dates);
  }, [doctorId, doctors]);

  // Load the doctor's single working shift for the selected date
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
            label: `${formatTime(
              availableShift.start_time
            )} – ${formatTime(availableShift.end_time)}`,
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

    if (!doctorId || !date || !shift) {
      return;
    }

    const patientAge = Number(age);

    if (
      !Number.isInteger(patientAge) ||
      patientAge < 1 ||
      patientAge > 120
    ) {
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

        // Compatibility with the existing API/database:
        // the appointment time stores the SHIFT START.
        // It is NOT an exact patient consultation time.
        appointment_time: shift.start_time,

        reason,
      });

      setConfirmation(appointment.appointment_code);
      setStatus("done");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-teal-950">
          Appointment requested
        </h1>

        <p className="mt-3 text-slate-600">
          Your appointment ID is{" "}
          <span className="font-mono font-medium">
            {confirmation}
          </span>
          .
        </p>

        <p className="mt-4 text-slate-600">
          Your appointment is booked for the doctor's working
          shift on{" "}
          <span className="font-medium">
            {formatDateForDisplay(date)}
          </span>
          .
        </p>

        {shift && (
          <p className="mt-2 text-slate-600">
            Doctor's shift:{" "}
            <span className="font-medium">
              {shift.label}
            </span>
          </p>
        )}

        <p className="mt-4 text-slate-600">
          A confirmation email will be sent to{" "}
          <span className="font-medium">{email}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-teal-950">
        Book an Appointment
      </h1>

      <p className="mt-2 text-slate-600">
        No account needed — just the details below.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-4"
      >
        {/* Department */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Department
          </label>

          <select
            className="input-field mt-1"
            required
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
            }}
          >
            <option value="">
              Select department
            </option>

            {departments.map((department) => (
              <option
                key={department.id}
                value={department.id}
              >
                {department.name}
              </option>
            ))}
          </select>
        </div>

        {/* Doctor */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Doctor
          </label>

          <select
            className="input-field mt-1"
            required
            value={doctorId}
            disabled={!departmentId}
            onChange={(e) => {
              setDoctorId(e.target.value);
            }}
          >
            <option value="">
              Select doctor
            </option>

            {doctors.map((doctor) => (
              <option
                key={doctor.id}
                value={doctor.id}
              >
                {doctor.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Date and Shift */}
        <div className="grid grid-cols-2 gap-4">
          {/* Available Date */}
          <div>
            <label className="text-sm font-medium text-slate-700">
              Date
            </label>

            <select
              className="input-field mt-1"
              required
              value={date}
              disabled={
                !doctorId ||
                availableDates.length === 0
              }
              onChange={(e) => {
                setDate(e.target.value);
              }}
            >
              <option value="">
                {!doctorId
                  ? "Select a doctor first"
                  : availableDates.length === 0
                  ? "No available dates"
                  : "Select available date"}
              </option>

              {availableDates.map((availableDate) => (
                <option
                  key={availableDate}
                  value={availableDate}
                >
                  {formatDateForDisplay(availableDate)}
                </option>
              ))}
            </select>

            {doctorId &&
              availableDates.length === 0 && (
                <p className="mt-1 text-sm text-slate-500">
                  This doctor has no scheduled working days.
                </p>
              )}
          </div>

          {/* Doctor's Shift */}
          <div>
            <label className="text-sm font-medium text-slate-700">
              Doctor's Shift
            </label>

            <div className="input-field mt-1 flex min-h-[42px] items-center">
              {availabilityLoading ? (
                <span className="text-slate-500">
                  Loading shift...
                </span>
              ) : !date ? (
                <span className="text-slate-500">
                  Select a date first
                </span>
              ) : shift ? (
                <span className="font-medium text-teal-950">
                  {shift.label}
                </span>
              ) : (
                <span className="text-slate-500">
                  Doctor is not working on this date
                </span>
              )}
            </div>

            {shift && (
              <p className="mt-1 text-xs text-slate-500">
                Multiple patients can book this shift. You do
                not need to select an exact consultation time.
              </p>
            )}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Reason for visit
          </label>

          <textarea
            className="input-field mt-1"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <hr className="border-slate-200" />

        <p className="text-sm font-medium text-slate-700">
          Your details (minimum necessary information)
        </p>

        {/* Full name */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Full name
          </label>

          <input
            className="input-field mt-1"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        {/* Age */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Age
          </label>

          <input
            type="number"
            min="1"
            max="120"
            required
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="input-field mt-1"
            placeholder="Enter your age"
          />
        </div>

        {/* Phone and Email */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Phone
            </label>

            <input
              className="input-field mt-1"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Email
            </label>

            <input
              type="email"
              className="input-field mt-1"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
        </div>

        {/* Error */}
        {status === "error" && (
          <p className="text-sm text-red-600">
            Please enter a valid age between 1 and 120, and make
            sure all required information is filled in.
          </p>
        )}

        {/* Submit */}
        <button
          className="btn-primary w-full"
          disabled={
            status === "submitting" ||
            !doctorId ||
            !date ||
            !shift
          }
        >
          {status === "submitting"
            ? "Booking..."
            : "Confirm Appointment"}
        </button>
      </form>
    </div>
  );
}