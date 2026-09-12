import { useEffect, useMemo, useState } from "react";
import { appointmentsApi } from "../../lib/apiClient";
import type { Appointment } from "../../lib/types";
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  Search,
  ShieldCheck,
  Stethoscope,
  Filter,
} from "../../components/icons/Icons";

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

function formatDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return dateString;

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
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

export default function AdminAppointments() {
  const [rows, setRows] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const data = await appointmentsApi.listAll();
      setRows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: Appointment["status"]) {
    try {
      setActionId(id);
      await appointmentsApi.updateStatus(id, status);
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setActionId(null);
    }
  }

  const filteredRows = useMemo(() => {
    let result = [...rows];

    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.appointment_code?.toLowerCase().includes(q) ||
          r.patient_name?.toLowerCase().includes(q) ||
          r.doctor_name?.toLowerCase().includes(q) ||
          r.department_name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [rows, statusFilter, search]);

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const confirmedCount = rows.filter((r) => r.status === "confirmed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Central OPD Token Registry
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Hospital Appointments ({rows.length})
          </h1>
          <p className="text-xs text-slate-500">
            Monitor, view, and track patient bookings across all clinical shifts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200/60">
            <span className="font-bold">{confirmedCount}</span> Confirmed Appointments
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by token code, patient name, doctor, or department..."
            className="input-field pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field py-1.5 text-xs w-auto"
          >
            <option value="all">All Statuses ({rows.length})</option>
            <option value="pending">Pending ({pendingCount})</option>
            <option value="confirmed">Confirmed ({confirmedCount})</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Appointments Data Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Token Code</th>
                <th className="px-5 py-3.5">Patient Details</th>
                <th className="px-5 py-3.5">Consulting Specialist</th>
                <th className="px-5 py-3.5">Appointment Date</th>
                <th className="px-5 py-3.5">Doctor's Shift</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
                    <p className="mt-2">Loading appointments registry...</p>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No appointments found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const isPending = r.status === "pending";
                  const isConfirmed = r.status === "confirmed";

                  return (
                    <tr
                      key={r.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-bold tracking-wider text-teal-950 bg-teal-50 px-2 py-1 rounded-md border border-teal-200">
                          {r.appointment_code}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-teal-950">
                          {r.patient_name || "Unknown patient"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {r.patient_age !== undefined && `Age: ${r.patient_age} yrs`}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">
                          {r.doctor_name || "Unknown specialist"}
                        </div>
                        {r.department_name && (
                          <div className="text-[11px] text-slate-500">
                            {r.department_name}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-700 font-medium">
                        {formatDate(r.appointment_date)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-1.5 font-semibold text-teal-950">
                          <Clock className="h-3.5 w-3.5 text-teal-700" />
                          {getShiftLabel(r)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          OPD working shift
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                            isConfirmed
                              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                              : isPending
                              ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isConfirmed
                                ? "bg-emerald-500"
                                : isPending
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {r.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {isConfirmed ? (
                          <button
                            type="button"
                            disabled={actionId === r.id}
                            onClick={() => updateStatus(r.id, "completed")}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                          >
                            Mark Completed
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] capitalize">
                            {r.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}