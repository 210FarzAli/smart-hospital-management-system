import { Link } from "react-router-dom";
import type { Doctor } from "../lib/types";
import StarRating from "./StarRating";
import { CalendarIcon, ChevronRightIcon, ShieldCheckIcon } from "./icons/Icons";

export default function DoctorCard({ doctor }: { doctor: Doctor }) {
  const initials = doctor.full_name
    .replace("Dr. ", "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-card">
      <div>
        {/* Top: Avatar & Verified Badge */}
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            {doctor.photo_url ? (
              <img
                src={doctor.photo_url}
                alt={doctor.full_name}
                className="h-16 w-16 rounded-2xl object-cover ring-2 ring-teal-100"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-800 to-teal-950 text-xl font-bold text-teal-50 shadow-inner">
                {initials}
              </div>
            )}
            <span
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white shadow-sm"
              title="Verified Medical Practitioner"
            >
              <ShieldCheckIcon className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            {doctor.department_name && (
              <span className="inline-block truncate rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-teal-800 border border-teal-200/50 mb-1">
                {doctor.department_name}
              </span>
            )}
            <h3 className="truncate text-base font-bold text-slate-900 group-hover:text-teal-900 transition-colors">
              <Link to={`/doctors/${doctor.id}`}>{doctor.full_name}</Link>
            </h3>
            <p className="truncate text-xs font-medium text-slate-500">
              {doctor.specialization}
            </p>
          </div>
        </div>

        {/* Experience & Qualification snippet */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          {doctor.experience_years > 0 && (
            <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700">
              {doctor.experience_years}+ yrs exp.
            </span>
          )}
          {doctor.qualification && (
            <span className="truncate rounded-md bg-slate-100 px-2 py-1 text-slate-600 max-w-[170px]" title={doctor.qualification}>
              {doctor.qualification}
            </span>
          )}
        </div>

        {/* Rating */}
        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
          <StarRating rating={doctor.rating} />
          <div className="text-right">
            <span className="text-[11px] uppercase tracking-wide text-slate-400 block font-medium">Fee</span>
            <span className="text-sm font-bold text-teal-950">
              Rs. {doctor.consultation_fee.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100">
        <Link
          to={`/doctors/${doctor.id}`}
          className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-center text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300"
        >
          View Profile
        </Link>
        <Link
          to={`/book?doctorId=${doctor.id}`}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-teal-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-800"
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Book</span>
        </Link>
      </div>
    </div>
  );
}
