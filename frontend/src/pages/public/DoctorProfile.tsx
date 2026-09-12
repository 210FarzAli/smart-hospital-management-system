import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { doctorsApi } from "../../lib/apiClient";
import type { Doctor } from "../../lib/types";
import StarRating from "../../components/StarRating";
import { getPatientFriendlyDepartmentName } from "../../lib/departmentUtils";
import {
  ChevronRightIcon,
  ShieldCheckIcon,
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  UserIcon,
} from "../../components/icons/Icons";

function formatTime(time: string) {
  if (!time) return "";
  const [hourString, minuteString] = time.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return time;
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DoctorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  // Selected date and shift state for booking flow
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    doctorsApi
      .get(id)
      .then((doc) => {
        setDoctor(doc);
        // Find first available upcoming date
        if (doc && doc.availability && doc.availability.length > 0) {
          const availableDays = new Set(doc.availability.map((a) => a.day.trim().toLowerCase()));
          const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
          const today = new Date();
          for (let i = 0; i < 30; i++) {
            const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
            const dayName = dayNames[d.getDay()];
            if (availableDays.has(dayName)) {
              setSelectedDate(formatDateForInput(d));
              break;
            }
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16">
        <div className="h-64 rounded-3xl bg-slate-100 animate-pulse" />
        <div className="mt-8 h-48 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 text-center">
        <UserIcon className="mx-auto w-12 h-12 text-slate-300" />
        <h2 className="mt-4 text-xl font-bold text-slate-800">Doctor Profile Not Found</h2>
        <p className="mt-2 text-sm text-slate-500">The requested doctor is not currently registered or available.</p>
        <Link to="/doctors" className="btn-primary mt-6">
          Browse All Doctors
        </Link>
      </div>
    );
  }

  const initials = doctor.full_name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  // Determine active shift for the selected date
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let activeShiftForSelectedDate: { day: string; start_time: string; end_time: string } | null = null;
  if (selectedDate) {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dayNames[dateObj.getDay()];
    activeShiftForSelectedDate =
      doctor.availability?.find((a) => a.day.trim().toLowerCase() === dayOfWeek.toLowerCase()) || null;
  }

  function handleBookShift(dateToBook: string, startTime: string) {
    if (!dateToBook || !startTime) return;
    navigate(`/book?doctorId=${doctor?.id}&date=${dateToBook}&time=${startTime}`);
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Breadcrumb Header */}
      <div className="border-b border-slate-200/80 bg-white py-4 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Link to="/" className="hover:text-teal-900 transition">Home</Link>
            <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400" />
            <Link to="/doctors" className="hover:text-teal-900 transition">Doctors</Link>
            <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-semibold">{doctor.full_name}</span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 mt-8 space-y-8">
        {/* Profile Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-9 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {doctor.photo_url ? (
                <img
                  src={doctor.photo_url}
                  alt={doctor.full_name}
                  className="h-28 w-28 rounded-3xl object-cover ring-4 ring-teal-50"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-800 to-teal-950 text-3xl font-extrabold text-teal-50 shadow-inner">
                  {initials}
                </div>
              )}
              <span
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-white shadow-sm"
                title="Verified Consultant Doctor"
              >
                <ShieldCheckIcon className="w-5 h-5" />
              </span>
            </div>

            {/* Basic Info */}
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {doctor.department_name && (
                  <span className="badge-teal">
                    {getPatientFriendlyDepartmentName(doctor.department_name)}
                  </span>
                )}
                <span className="badge-emerald">
                  <CheckCircleIcon className="w-3 h-3 text-emerald-600" />
                  Verified Practitioner
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {doctor.full_name}
              </h1>

              <p className="text-base font-semibold text-teal-800">
                {doctor.specialization}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                {doctor.qualification && (
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                    {doctor.qualification}
                  </span>
                )}
                {doctor.experience_years > 0 && (
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                    {doctor.experience_years} Years Experience
                  </span>
                )}
              </div>

              <div className="pt-2">
                <StarRating rating={doctor.rating} size="md" />
              </div>
            </div>

            {/* Explicit OPD Consultation Fee Card */}
            <div className="w-full sm:w-64 rounded-2xl border border-teal-100 bg-teal-50/60 p-5 text-center flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                  OPD Consultation Fee
                </span>
                <div className="mt-1 text-2xl font-extrabold text-teal-950">
                  Rs. {Number(doctor.consultation_fee).toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Pay Physically at Reception Desk
                </span>
                <span className="text-[10px] text-teal-700 font-medium block mt-0.5">
                  (No online payment taken)
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (selectedDate && activeShiftForSelectedDate) {
                    handleBookShift(selectedDate, activeShiftForSelectedDate.start_time);
                  } else {
                    navigate(`/book?doctorId=${doctor.id}`);
                  }
                }}
                className="btn-primary mt-4 w-full py-2.5 text-xs font-bold"
              >
                <CalendarIcon className="w-4 h-4" />
                <span>Book This Doctor</span>
              </button>
            </div>
          </div>

          {/* Description */}
          {doctor.description && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                About the Doctor
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                {doctor.description}
              </p>
            </div>
          )}
        </div>

        {/* OPD Working Schedule & Shift-Based Booking */}
        <div className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                OPD Schedule & Bookable Shifts
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Select your preferred date and book the doctor's working shift. Your selection will autofill directly on the booking page.
              </p>
            </div>
            <div className="flex items-center gap-2 text-teal-800 text-xs font-semibold">
              <ClockIcon className="w-5 h-5 text-teal-700" />
              <span>Shift-Based Consultation</span>
            </div>
          </div>

          {/* Quick Date Selector */}
          <div className="mt-6 rounded-2xl bg-teal-50/50 p-5 border border-teal-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-teal-900">
                  Select Consultation Date:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={formatDateForInput(new Date())}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-field mt-1.5 text-xs font-medium w-full sm:w-60 bg-white"
                />
              </div>

              <div className="flex-1 sm:pl-4">
                {selectedDate && activeShiftForSelectedDate ? (
                  <div className="rounded-xl bg-white p-3 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block">
                        Available Shift on {activeShiftForSelectedDate.day}:
                      </span>
                      <span className="text-sm font-extrabold text-teal-950">
                        {formatTime(activeShiftForSelectedDate.start_time)} – {formatTime(activeShiftForSelectedDate.end_time)}
                      </span>
                      <span className="text-xs text-slate-500 block">
                        OPD Fee: Rs. {Number(doctor.consultation_fee).toLocaleString()} (Pay at Reception)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleBookShift(selectedDate, activeShiftForSelectedDate!.start_time)}
                      className="btn-primary py-2 px-4 text-xs font-bold whitespace-nowrap"
                    >
                      Book This Shift →
                    </button>
                  </div>
                ) : selectedDate ? (
                  <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs text-amber-800">
                    Dr. {doctor.full_name} does not hold an active OPD shift on this selected day. Please select one of the registered schedule days below.
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Pick a date above to check shift timings.</p>
                )}
              </div>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                    Day
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                    Shift Timings
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                    OPD Consultation Fee
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-600">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doctor.availability && doctor.availability.length > 0 ? (
                  doctor.availability.map((a, i) => {
                    // Calculate next date for this day
                    const dayNamesShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                    const today = new Date();
                    let targetDateString = "";
                    for (let step = 0; step < 14; step++) {
                      const candidate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + step);
                      if (dayNamesShort[candidate.getDay()].toLowerCase() === a.day.trim().toLowerCase()) {
                        targetDateString = formatDateForInput(candidate);
                        break;
                      }
                    }

                    return (
                      <tr key={i} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-4 font-bold text-slate-900">
                          {a.day}
                        </td>
                        <td className="px-5 py-4 text-slate-700 font-medium">
                          {formatTime(a.start_time)} – {formatTime(a.end_time)}
                        </td>
                        <td className="px-5 py-4 font-semibold text-teal-950">
                          Rs. {Number(doctor.consultation_fee).toLocaleString()}{" "}
                          <span className="text-[11px] font-normal text-slate-500">(Pay at Reception)</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleBookShift(targetDateString, a.start_time)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 hover:text-teal-600 underline"
                          >
                            <span>Book Shift</span>
                            <ChevronRightIcon className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-sm text-slate-500">
                      No weekly shifts currently registered. Please contact the hospital helpdesk.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
