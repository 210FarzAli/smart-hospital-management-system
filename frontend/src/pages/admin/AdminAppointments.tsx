import { useEffect, useState } from "react";
import { appointmentsApi } from "../../lib/apiClient";
import type { Appointment } from "../../lib/types";

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

  if (!year || !month || !day) {
    return dateString;
  }

  return new Date(year, month - 1, day).toLocaleDateString(
    "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function getShiftLabel(appointment: Appointment) {
  if (appointment.shift_start && appointment.shift_end) {
    return `${formatTime(
      appointment.shift_start
    )} – ${formatTime(appointment.shift_end)}`;
  }

  if (appointment.shift_label) {
    return appointment.shift_label;
  }

  // Compatibility fallback for older records.
  if (appointment.appointment_time) {
    return `${formatTime(appointment.appointment_time)} shift`;
  }

  return "Shift unavailable";
}

export default function AdminAppointments() {
  const [rows, setRows] = useState<Appointment[]>([]);

  async function load() {
    const data = await appointmentsApi.listAll();
    setRows(data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function updateStatus(
    id: string,
    status: Appointment["status"]
  ) {
    await appointmentsApi.updateStatus(id, status);
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-teal-950">
        Appointments
      </h1>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Patient</th>
              <th className="px-4 py-2">Doctor</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Doctor's Shift</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-t border-slate-100"
              >
                <td className="px-4 py-2 font-mono text-xs">
                  {r.appointment_code}
                </td>

                <td className="px-4 py-2">
                  <div className="font-medium text-slate-800">
                    {r.patient_name || "Unknown patient"}
                  </div>

                  {r.patient_age !== undefined && (
                    <div className="text-xs text-slate-500">
                      Age: {r.patient_age}
                    </div>
                  )}
                </td>

                <td className="px-4 py-2">
                  <div className="font-medium text-slate-800">
                    {r.doctor_name || "Unknown doctor"}
                  </div>

                  {r.department_name && (
                    <div className="text-xs text-slate-500">
                      {r.department_name}
                    </div>
                  )}
                </td>

                <td className="px-4 py-2">
                  {formatDate(r.appointment_date)}
                </td>

                <td className="px-4 py-2">
                  <div className="font-medium text-teal-950">
                    {getShiftLabel(r)}
                  </div>

                  <div className="text-xs text-slate-500">
                    Patient books the doctor's working shift
                  </div>
                </td>

                <td className="px-4 py-2 capitalize">
                  {r.status}
                </td>

                <td className="px-4 py-2">
                  {r.status === "pending" && (
                    <button
                      className="text-teal-700 hover:underline"
                      onClick={() =>
                        updateStatus(r.id, "confirmed")
                      }
                    >
                      Confirm
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="p-6 text-slate-500">
            No appointments found.
          </p>
        )}
      </div>
    </div>
  );
}