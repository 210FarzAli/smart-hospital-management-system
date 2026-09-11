import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { doctorsApi, reviewsApi } from "../../lib/apiClient";
import type { Doctor } from "../../lib/types";
import type { HospitalReview } from "../../lib/apiClient";
import StarRating from "../../components/StarRating";
import {
  ChevronRightIcon,
  ShieldCheckIcon,
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  StethoscopeIcon,
  DollarSignIcon,
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

export default function DoctorProfile() {
  const { id } = useParams();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [reviews, setReviews] = useState<HospitalReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      doctorsApi.get(id),
      reviewsApi.list(id),
    ])
      .then(([doc, revs]) => {
        setDoctor(doc);
        setReviews(revs || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16">
        <div className="h-64 rounded-3xl bg-slate-100 animate-pulse"></div>
        <div className="mt-8 h-48 rounded-2xl bg-slate-100 animate-pulse"></div>
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
    .replace("Dr. ", "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

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
                    {doctor.department_name}
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

            {/* Fee & Book Quick Action */}
            <div className="w-full sm:w-56 rounded-2xl border border-teal-100 bg-teal-50/60 p-5 text-center flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                  Consultation Fee
                </span>
                <div className="mt-1 text-2xl font-extrabold text-teal-950">
                  Rs. {doctor.consultation_fee.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5">Per OPD Session</span>
              </div>

              <Link
                to={`/book?doctorId=${doctor.id}`}
                className="btn-primary mt-4 w-full py-2.5 text-xs font-bold"
              >
                <CalendarIcon className="w-4 h-4" />
                <span>Book Appointment</span>
              </Link>
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

        {/* OPD Working Schedule */}
        <div className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                OPD Schedule & Working Shifts
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Patients book the doctor's active working shift rather than an isolated time slot.
              </p>
            </div>
            <ClockIcon className="w-6 h-6 text-teal-700" />
          </div>

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
                    OPD Session
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-600">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doctor.availability && doctor.availability.length > 0 ? (
                  doctor.availability.map((a, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-4 font-bold text-slate-900">
                        {a.day}
                      </td>
                      <td className="px-5 py-4 text-slate-700 font-medium">
                        {formatTime(a.start_time)} – {formatTime(a.end_time)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="badge-emerald">Active OPD Shift</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/book?doctorId=${doctor.id}`}
                          className="text-xs font-bold text-teal-800 hover:text-teal-600 underline"
                        >
                          Book Shift
                        </Link>
                      </td>
                    </tr>
                  ))
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

        {/* Patient Reviews Section */}
        <div className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Patient Reviews ({reviews.length})
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Feedback submitted by patients who consulted with {doctor.full_name}.
              </p>
            </div>
            <StarRating rating={doctor.rating} size="md" />
          </div>

          <div className="mt-6 space-y-4">
            {reviews.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                No patient reviews recorded yet for this doctor.
              </p>
            ) : (
              reviews.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-slate-200 p-5 transition hover:border-teal-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{r.reviewer_name}</span>
                      {r.is_verified_patient && (
                        <span className="badge-emerald">
                          Verified Patient
                        </span>
                      )}
                    </div>
                    <StarRating rating={r.rating} size="sm" showNumber={false} />
                  </div>
                  {r.comment && (
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                      “{r.comment}”
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
