import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  prescriptionsApi,
  type MedicineLine,
} from "../../lib/apiClient";

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  "http://localhost:5000/api";

interface AppointmentWithPatient {
  id: string;
  patient_id: string;
  patient_name?: string;
  patient_phone?: string | null;
  patient_email?: string | null;
  appointment_date: string;

  // Kept for compatibility with the existing database.
  // This is the shift start, NOT an exact consultation time.
  appointment_time: string;

  shift_start?: string;
  shift_end?: string;
  shift_label?: string;

  doctor_name?: string;
  doctor_specialization?: string;
  department_name?: string;

  reason?: string | null;
  status?: string;
}

interface SavedPrescription {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  consultation_notes: string | null;
  created_at: string;
  details: {
    id: string;
    prescription_id: string;
    medicine_name: string;
    quantity: string | null;
    dosage: string | null;
    duration: string | null;
  }[];
}

function formatTime(time?: string | null) {
  if (!time) return "—";

  const parts = time.split(":");

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes)
  ) {
    return time;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "—";

  // SQL Server can return:
  // 2026-09-04T00:00:00.000Z
  // or
  // 2026-09-04
  const datePart = dateString.slice(0, 10);

  const [year, month, day] = datePart
    .split("-")
    .map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return dateString;
  }

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getShiftLabel(
  appointment: AppointmentWithPatient
) {
  if (
    appointment.shift_start &&
    appointment.shift_end
  ) {
    return `${formatTime(
      appointment.shift_start
    )} – ${formatTime(appointment.shift_end)}`;
  }

  if (appointment.shift_label) {
    return appointment.shift_label;
  }

  if (appointment.appointment_time) {
    return `${formatTime(
      appointment.appointment_time
    )} shift`;
  }

  return "Shift unavailable";
}

function isCompleted(status?: string) {
  return String(status || "").toLowerCase() === "completed";
}

export default function DoctorConsultation() {
  const { appointmentId } = useParams();

  const [appointment, setAppointment] =
    useState<AppointmentWithPatient | null>(null);

  const [savedPrescription, setSavedPrescription] =
    useState<SavedPrescription | null>(null);

  const [notes, setNotes] = useState("");

  const [medicines, setMedicines] =
    useState<MedicineLine[]>([
      {
        medicine_name: "",
        quantity: "",
        dosage: "",
        duration: "",
      },
    ]);

  const [loading, setLoading] = useState(true);
  const [loadingPrescription, setLoadingPrescription] =
    useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!appointmentId) return;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const token =
          localStorage.getItem("hospital_token");

        const appointmentResponse = await fetch(
          `${BASE_URL}/appointments/${appointmentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!appointmentResponse.ok) {
          throw new Error(
            "Failed to load appointment."
          );
        }

        const appointmentData =
          await appointmentResponse.json();

        setAppointment(appointmentData);

        // If appointment is already completed,
        // load the saved consultation/prescription.
        if (isCompleted(appointmentData.status)) {
          setLoadingPrescription(true);

          try {
            const prescriptionResponse =
              await fetch(
                `${BASE_URL}/prescriptions/appointment/${appointmentId}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

            if (prescriptionResponse.ok) {
              const prescriptionData =
                await prescriptionResponse.json();

              setSavedPrescription(
                prescriptionData
              );
            } else if (
              prescriptionResponse.status === 404
            ) {
              setSavedPrescription(null);
            } else {
              throw new Error(
                "Failed to load saved consultation."
              );
            }
          } finally {
            setLoadingPrescription(false);
          }
        }
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load consultation."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [appointmentId]);

  function updateMedicine(
    index: number,
    field: keyof MedicineLine,
    value: string
  ) {
    setMedicines((previous) =>
      previous.map((medicine, i) =>
        i === index
          ? {
              ...medicine,
              [field]: value,
            }
          : medicine
      )
    );
  }

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!appointment) return;

    try {
      setSaving(true);
      setError("");

      await prescriptionsApi.create({
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        consultation_notes: notes,
        medicines: medicines.filter(
          (medicine) =>
            medicine.medicine_name?.trim()
        ),
      });

      setSaved(true);

      // Reload the saved prescription so the page
      // immediately becomes the completed/read-only view.
      const token =
        localStorage.getItem("hospital_token");

      const prescriptionResponse =
        await fetch(
          `${BASE_URL}/prescriptions/appointment/${appointment.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      if (prescriptionResponse.ok) {
        const prescriptionData =
          await prescriptionResponse.json();

        setSavedPrescription(
          prescriptionData
        );
      }

      setAppointment((previous) =>
        previous
          ? {
              ...previous,
              status: "completed",
            }
          : previous
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save consultation."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <p className="text-slate-500">
          Loading consultation...
        </p>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">
          {error}
        </p>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="max-w-2xl">
        <p className="text-slate-500">
          Appointment not found.
        </p>
      </div>
    );
  }

  /*
   * ============================================================
   * COMPLETED APPOINTMENT
   * ============================================================
   */

  if (
    isCompleted(appointment.status) ||
    saved
  ) {
    if (loadingPrescription) {
      return (
        <div className="max-w-2xl">
          <p className="text-slate-500">
            Loading saved consultation...
          </p>
        </div>
      );
    }

    return (
      <div className="max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-teal-950">
              Consultation —{" "}
              {appointment.patient_name}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Completed consultation record
            </p>
          </div>

          <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
            Completed
          </span>
        </div>

        {/* Appointment Information */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-teal-950">
            Appointment Details
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">
                Patient
              </p>

              <p className="mt-1 font-medium text-slate-800">
                {appointment.patient_name ||
                  "—"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Appointment Date
              </p>

              <p className="mt-1 font-medium text-slate-800">
                {formatDate(
                  appointment.appointment_date
                )}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Doctor's Shift
              </p>

              <p className="mt-1 font-medium text-teal-950">
                {getShiftLabel(appointment)}
              </p>
            </div>

            {appointment.reason && (
              <div>
                <p className="text-sm text-slate-500">
                  Reason for Visit
                </p>

                <p className="mt-1 font-medium text-slate-800">
                  {appointment.reason}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Consultation Notes */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-teal-950">
            Consultation Notes
          </h2>

          <div className="mt-3 rounded-lg bg-slate-50 p-4">
            {savedPrescription?.consultation_notes ? (
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {
                  savedPrescription.consultation_notes
                }
              </p>
            ) : (
              <p className="text-sm italic text-slate-500">
                No consultation notes were recorded.
              </p>
            )}
          </div>
        </div>

        {/* Prescription */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-teal-950">
            Prescription
          </h2>

          {!savedPrescription ||
          savedPrescription.details.length === 0 ? (
            <div className="mt-3 rounded-lg bg-slate-50 p-4">
              <p className="text-sm italic text-slate-500">
                No medicines were prescribed.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-slate-600">
                      Medicine
                    </th>

                    <th className="px-4 py-3 font-medium text-slate-600">
                      Quantity
                    </th>

                    <th className="px-4 py-3 font-medium text-slate-600">
                      Dosage
                    </th>

                    <th className="px-4 py-3 font-medium text-slate-600">
                      Duration
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {savedPrescription.details.map(
                    (medicine) => (
                      <tr key={medicine.id}>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {medicine.medicine_name}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {medicine.quantity ||
                            "—"}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {medicine.dosage ||
                            "—"}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {medicine.duration ||
                            "—"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}
      </div>
    );
  }

  /*
   * ============================================================
   * NOT COMPLETED — SHOW CONSULTATION FORM
   * ============================================================
   */

  return (
    <div className="max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-teal-950">
          Consultation —{" "}
          {appointment.patient_name}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Record consultation notes and prescription.
        </p>
      </div>

      {/* Appointment Information */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-teal-950">
          Appointment Details
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">
              Patient
            </p>

            <p className="mt-1 font-medium text-slate-800">
              {appointment.patient_name || "—"}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Appointment Date
            </p>

            <p className="mt-1 font-medium text-slate-800">
              {formatDate(
                appointment.appointment_date
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Doctor's Shift
            </p>

            <p className="mt-1 font-medium text-teal-950">
              {getShiftLabel(appointment)}
            </p>
          </div>

          {appointment.reason && (
            <div>
              <p className="text-sm text-slate-500">
                Reason for Visit
              </p>

              <p className="mt-1 font-medium text-slate-800">
                {appointment.reason}
              </p>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          This patient is booked for the doctor's
          working shift, not an exact consultation
          time.
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-6"
      >
        {/* Consultation Notes */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <label className="text-sm font-medium text-slate-700">
            Consultation Notes
          </label>

          <textarea
            className="input-field mt-2 w-full"
            rows={5}
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            placeholder="Enter consultation notes..."
          />
        </div>

        {/* Prescription */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">
              Prescription
            </label>

            <button
              type="button"
              className="text-sm font-medium text-teal-700 hover:underline"
              onClick={() =>
                setMedicines((previous) => [
                  ...previous,
                  {
                    medicine_name: "",
                    quantity: "",
                    dosage: "",
                    duration: "",
                  },
                ])
              }
            >
              + Add medicine
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {medicines.map(
              (medicine, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-4"
                >
                  <input
                    className="input-field"
                    placeholder="Medicine"
                    value={
                      medicine.medicine_name
                    }
                    onChange={(event) =>
                      updateMedicine(
                        index,
                        "medicine_name",
                        event.target.value
                      )
                    }
                  />

                  <input
                    className="input-field"
                    placeholder="Quantity"
                    value={medicine.quantity}
                    onChange={(event) =>
                      updateMedicine(
                        index,
                        "quantity",
                        event.target.value
                      )
                    }
                  />

                  <input
                    className="input-field"
                    placeholder="Dosage"
                    value={medicine.dosage}
                    onChange={(event) =>
                      updateMedicine(
                        index,
                        "dosage",
                        event.target.value
                      )
                    }
                  />

                  <input
                    className="input-field"
                    placeholder="Duration"
                    value={medicine.duration}
                    onChange={(event) =>
                      updateMedicine(
                        index,
                        "duration",
                        event.target.value
                      )
                    }
                  />
                </div>
              )
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving
            ? "Saving..."
            : "Save Consultation & Prescription"}
        </button>
      </form>
    </div>
  );
}