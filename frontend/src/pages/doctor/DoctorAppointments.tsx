import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { appointmentsApi } from "../../lib/apiClient";
import type { Appointment } from "../../lib/types";

type AppointmentFilter =
  | "all"
  | "today"
  | "upcoming"
  | "old";

function formatTime(time?: string | null) {
  if (!time) return "—";

  const [hoursString, minutesString] =
    time.split(":");

  const hours = Number(hoursString);
  const minutes = Number(minutesString);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes)
  ) {
    return time;
  }

  const date = new Date();

  date.setHours(
    hours,
    minutes,
    0,
    0
  );

  return date.toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );
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

function getShiftLabel(
  appointment: Appointment
) {
  if (
    appointment.shift_start &&
    appointment.shift_end
  ) {
    return `${formatTime(
      appointment.shift_start
    )} – ${formatTime(
      appointment.shift_end
    )}`;
  }

  if (appointment.shift_label) {
    return appointment.shift_label;
  }

  // Compatibility fallback for older appointments.
  if (appointment.appointment_time) {
    return `${formatTime(
      appointment.appointment_time
    )} shift`;
  }

  return "Shift unavailable";
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

  // Handles:
  // 2026-09-04
  // 2026-09-04T00:00:00.000Z
  // 2026-09-04T00:00:00
  const match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );
  }

  // Final fallback
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

function getTodayDate() {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
}

function isToday(
  dateString: string
) {
  const date =
    getDateOnly(dateString);

  const today =
    getTodayDate();

  return (
    date.getTime() ===
    today.getTime()
  );
}

function isUpcoming(
  dateString: string
) {
  const date =
    getDateOnly(dateString);

  const today =
    getTodayDate();

  return date.getTime() > today.getTime();
}

function isOld(
  dateString: string
) {
  const date =
    getDateOnly(dateString);

  const today =
    getTodayDate();

  return date.getTime() < today.getTime();
}

// ============================================================
// DOCTOR APPOINTMENTS
// ============================================================
export default function DoctorAppointments() {
  const [rows, setRows] =
    useState<Appointment[]>([]);

  const [filter, setFilter] =
    useState<AppointmentFilter>(
      "all"
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null
    );

  // ==========================================================
  // LOAD DOCTOR APPOINTMENTS
  // ==========================================================
  async function loadAppointments() {
    try {
      setLoading(true);
      setError(null);

      const data =
        await appointmentsApi.listMine();

      setRows(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load appointments."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  // ==========================================================
  // FILTER + SORT
  // ==========================================================
  const filteredRows =
    useMemo(() => {
      let result =
        [...rows];

      // ------------------------------------------------------
      // FILTER
      // ------------------------------------------------------
      if (filter === "today") {
        result = result.filter(
          (appointment) =>
            isToday(
              appointment.appointment_date
            )
        );
      }

      if (filter === "upcoming") {
        result = result.filter(
          (appointment) =>
            isUpcoming(
              appointment.appointment_date
            )
        );
      }

      if (filter === "old") {
        result = result.filter(
          (appointment) =>
            isOld(
              appointment.appointment_date
            )
        );
      }

      // ------------------------------------------------------
      // SORT
      // ------------------------------------------------------
      result.sort((a, b) => {
        const dateA =
          getDateOnly(
            a.appointment_date
          ).getTime();

        const dateB =
          getDateOnly(
            b.appointment_date
          ).getTime();

        if (filter === "old") {
          // Oldest first
          return dateA - dateB;
        }

        // Upcoming / Today / All:
        // nearest appointment first
        return dateA - dateB;
      });

      return result;
    }, [rows, filter]);

  // ==========================================================
  // FILTER COUNTS
  // ==========================================================
  const todayCount =
    rows.filter((appointment) =>
      isToday(
        appointment.appointment_date
      )
    ).length;

  const upcomingCount =
    rows.filter((appointment) =>
      isUpcoming(
        appointment.appointment_date
      )
    ).length;

  const oldCount =
    rows.filter((appointment) =>
      isOld(
        appointment.appointment_date
      )
    ).length;

  // ==========================================================
  // FILTER LABEL
  // ==========================================================
  function getFilterDescription() {
    if (filter === "today") {
      return "Showing appointments scheduled for today.";
    }

    if (filter === "upcoming") {
      return "Showing upcoming appointments.";
    }

    if (filter === "old") {
      return "Showing previous appointments.";
    }

    return "Showing all your appointments.";
  }

  return (
    <div>
      {/* ======================================================
          HEADER
      ====================================================== */}
      <div>
        <h1 className="text-2xl font-semibold text-teal-950">
          My Appointments
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          View and manage appointments assigned to you.
        </p>
      </div>

      {/* ======================================================
          FILTER
      ====================================================== */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Show
            </label>

            <select
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target
                    .value as AppointmentFilter
                )
              }
              className="input-field w-full md:w-64"
            >
              <option value="all">
                All Appointments ({rows.length})
              </option>

              <option value="today">
                Today ({todayCount})
              </option>

              <option value="upcoming">
                Upcoming ({upcomingCount})
              </option>

              <option value="old">
                Old / Past ({oldCount})
              </option>
            </select>
          </div>

          <button
            type="button"
            onClick={loadAppointments}
            disabled={loading}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading
              ? "Loading..."
              : "Refresh"}
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-500">
          {getFilterDescription()}
        </p>
      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}
      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ======================================================
          LOADING
      ====================================================== */}
      {loading && rows.length === 0 && (
        <div className="mt-6 text-sm text-slate-500">
          Loading appointments...
        </div>
      )}

      {/* ======================================================
          APPOINTMENT LIST
      ====================================================== */}
      <div className="mt-6 space-y-3">
        {!loading &&
          filteredRows.map((appointment) => (
            <div
              key={appointment.id}
              className="card flex flex-col gap-5 md:flex-row md:items-center md:justify-between"
            >
              {/* ------------------------------------------------
                  PATIENT INFORMATION
              ------------------------------------------------ */}
              <div>
                <div className="font-medium text-teal-950">
                  {appointment.patient_name ||
                    "Unknown patient"}
                </div>

                {appointment.patient_age !==
                  undefined && (
                  <div className="mt-1 text-xs text-slate-500">
                    Age:{" "}
                    {
                      appointment.patient_age
                    }
                  </div>
                )}

                {appointment.patient_phone && (
                  <div className="mt-1 text-sm text-slate-600">
                    Phone:{" "}
                    {
                      appointment.patient_phone
                    }
                  </div>
                )}

                {appointment.patient_email && (
                  <div className="mt-1 text-sm text-slate-600">
                    Email:{" "}
                    {
                      appointment.patient_email
                    }
                  </div>
                )}

                {/* Date */}
                <div className="mt-3 text-sm font-medium text-teal-950">
                  {formatDate(
                    appointment.appointment_date
                  )}
                </div>

                {/* Shift */}
                <div className="mt-1 text-sm text-slate-600">
                  <span className="font-medium text-teal-950">
                    Doctor's Shift:
                  </span>{" "}
                  {getShiftLabel(
                    appointment
                  )}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Patient is booked for the working
                  shift, not an exact consultation
                  time.
                </div>

                {/* Reason */}
                <div className="mt-2 text-sm text-slate-500">
                  <span className="font-medium">
                    Reason:
                  </span>{" "}
                  {appointment.reason ||
                    "No reason given"}
                </div>
              </div>

              {/* ------------------------------------------------
                  ACTIONS
              ------------------------------------------------ */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs capitalize text-teal-800">
                  {appointment.status}
                </span>

                <Link
                  to={`/doctor/consultation/${appointment.id}`}
                  className="btn-secondary"
                >
                  Open Consultation
                </Link>
              </div>
            </div>
          ))}

        {/* ======================================================
            NO RESULTS
        ====================================================== */}
        {!loading &&
          filteredRows.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
              <div className="font-medium text-teal-950">
                No appointments found
              </div>

              <p className="mt-1 text-sm text-slate-500">
                There are no appointments in the
                selected category.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}