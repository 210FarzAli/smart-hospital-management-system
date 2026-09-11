import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { appointmentsApi } from "../../lib/apiClient";
import type { Appointment } from "../../lib/types";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  Stethoscope,
  Refresh,
  ShieldCheck,
  ArrowRight,
  Search,
} from "../../components/icons/Icons";

type AppointmentFilter = "all" | "today" | "upcoming" | "old";

function formatTime(time?: string | null) {
  if (!time) return "—";
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

function getDateOnly(dateValue: string | Date) {
  if (dateValue instanceof Date) {
    return new Date(
      dateValue.getFullYear(),
      dateValue.getMonth(),
      dateValue.getDate()
    );
  }

  const text = String(dateValue).trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate()
    );
  }

  return new Date(NaN);
}

function formatDate(dateValue: string | Date) {
  const date = getDateOnly(dateValue);
  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getShiftLabel(appointment: Appointment) {
  if (appointment.shift_start && appointment.shift_end) {
    return `${formatTime(appointment.shift_start)} – ${formatTime(
      appointment.shift_end
    )}`;
  }
  if (appointment.shift_label) {
    return appointment.shift_label;
  }
  if (appointment.appointment_time) {
    return `${formatTime(appointment.appointment_time)} shift`;
  }
  return "Shift unavailable";
}

function getTodayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isToday(dateString: string) {
  const date = getDateOnly(dateString);
  const today = getTodayDate();
  return date.getTime() === today.getTime();
}

function isUpcoming(dateString: string) {
  const date = getDateOnly(dateString);
  const today = getTodayDate();
  return date.getTime() > today.getTime();
}

function isOld(dateString: string) {
  const date = getDateOnly(dateString);
  const today = getTodayDate();
  return date.getTime() < today.getTime();
}

export default function DoctorAppointments() {
  const [rows, setRows] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<AppointmentFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAppointments() {
    try {
      setLoading(true);
      setError(null);
      const data = await appointmentsApi.listMine();
      setRows(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load assigned appointments."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  const todayCount = rows.filter((a) => isToday(a.appointment_date)).length;
  const upcomingCount = rows.filter((a) => isUpcoming(a.appointment_date)).length;
  const oldCount = rows.filter((a) => isOld(a.appointment_date)).length;

  const filteredRows = useMemo(() => {
    let result = [...rows];

    if (filter === "today") {
      result = result.filter((a) => isToday(a.appointment_date));
    } else if (filter === "upcoming") {
      result = result.filter((a) => isUpcoming(a.appointment_date));
    } else if (filter === "old") {
      result = result.filter((a) => isOld(a.appointment_date));
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (a) =>
          a.patient_name?.toLowerCase().includes(q) ||
          a.appointment_code?.toLowerCase().includes(q) ||
          a.patient_phone?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const dateA = getDateOnly(a.appointment_date).getTime();
      const dateB = getDateOnly(b.appointment_date).getTime();
      return dateA - dateB;
    });

    return result;
  }, [rows, filter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            OPD Shift Consultations
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            My Appointments ({rows.length})
          </h1>
          <p className="text-xs text-slate-500">
            View patient roster booked for your OPD shifts and start consultation sessions.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAppointments}
          disabled={loading}
          className="btn-outline inline-flex items-center gap-2 text-xs"
        >
          <Refresh className="h-3.5 w-3.5" />
          Refresh Roster
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`card p-4 text-left transition-all ${
            filter === "all"
              ? "ring-2 ring-teal-600 bg-teal-50/40"
              : "hover:bg-slate-50/60"
          }`}
        >
          <div className="text-xs font-bold text-slate-500 uppercase">
            All Appointments
          </div>
          <div className="mt-1 text-2xl font-extrabold text-teal-950">
            {rows.length}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("today")}
          className={`card p-4 text-left transition-all ${
            filter === "today"
              ? "ring-2 ring-emerald-600 bg-emerald-50/40"
              : "hover:bg-slate-50/60"
          }`}
        >
          <div className="text-xs font-bold text-emerald-800 uppercase">
            Today's Shift
          </div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-700">
            {todayCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("upcoming")}
          className={`card p-4 text-left transition-all ${
            filter === "upcoming"
              ? "ring-2 ring-cyan-600 bg-cyan-50/40"
              : "hover:bg-slate-50/60"
          }`}
        >
          <div className="text-xs font-bold text-cyan-800 uppercase">
            Upcoming
          </div>
          <div className="mt-1 text-2xl font-extrabold text-cyan-700">
            {upcomingCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("old")}
          className={`card p-4 text-left transition-all ${
            filter === "old"
              ? "ring-2 ring-slate-400 bg-slate-100"
              : "hover:bg-slate-50/60"
          }`}
        >
          <div className="text-xs font-bold text-slate-500 uppercase">
            Past Records
          </div>
          <div className="mt-1 text-2xl font-extrabold text-slate-600">
            {oldCount}
          </div>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="card flex items-center gap-3 p-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient name, token code, or mobile number..."
            className="input-field pl-9 text-xs"
          />
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      {/* Appointment Cards List */}
      <div className="space-y-3">
        {loading && rows.length === 0 ? (
          <div className="card py-16 text-center text-slate-400">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
            <p className="mt-2 text-xs">Loading patient appointments...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="card py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-bold text-teal-950">
              No appointments in this category
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              No patients booked for the selected timeframe.
            </p>
          </div>
        ) : (
          filteredRows.map((app) => {
            const isCompleted = app.status === "completed";
            const isConfirmed = app.status === "confirmed";

            return (
              <div
                key={app.id}
                className="card flex flex-col justify-between gap-5 p-5 transition-all duration-200 hover:shadow-md md:flex-row md:items-center"
              >
                {/* Patient Information */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {app.appointment_code}
                    </span>
                    <h3 className="text-base font-bold text-teal-950">
                      {app.patient_name || "Unknown Patient"}
                    </h3>
                    {app.patient_age !== undefined && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {app.patient_age} yrs
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                        isCompleted
                          ? "bg-slate-100 text-slate-700"
                          : isConfirmed
                          ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                          : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>

                  {/* Date & Shift Info */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5 font-semibold text-teal-950">
                      <Calendar className="h-3.5 w-3.5 text-teal-700" />
                      {formatDate(app.appointment_date)}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-teal-900">
                      <Clock className="h-3.5 w-3.5 text-teal-700" />
                      Shift: {getShiftLabel(app)}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {app.patient_phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {app.patient_phone}
                      </span>
                    )}
                    {app.patient_email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-slate-400" />
                        {app.patient_email}
                      </span>
                    )}
                  </div>

                  {/* Reason */}
                  {app.reason && (
                    <div className="flex items-start gap-1.5 text-xs text-slate-600">
                      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>
                        <strong className="text-slate-700">Reason:</strong>{" "}
                        {app.reason}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    to={`/doctor/consultation/${app.id}`}
                    className="btn-primary inline-flex items-center gap-2 text-xs shadow-md shadow-teal-900/10"
                  >
                    <Stethoscope className="h-4 w-4" />
                    <span>
                      {isCompleted ? "View Consultation Record" : "Open Consultation"}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}