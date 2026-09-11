import { FormEvent, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  prescriptionsApi,
  pharmacyApi,
  type MedicineLine,
  type PharmacyMedicine,
} from "../../lib/apiClient";
import {
  Stethoscope,
  Calendar,
  Clock,
  User,
  Phone,
  FileText,
  Pill,
  Plus,
  Trash,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
} from "../../components/icons/Icons";

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

function formatDate(dateString?: string | null) {
  if (!dateString) return "—";
  const datePart = dateString.slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return dateString;
  }

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getShiftLabel(appointment: AppointmentWithPatient) {
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
  const [medicines, setMedicines] = useState<MedicineLine[]>([
  {
    medicine_id: "",
    medicine_name: "",
    quantity: "",
    dosage: "",
    duration: "",
  },
]);

const [pharmacyMedicines, setPharmacyMedicines] = useState<
  PharmacyMedicine[]
>([]);

const [loadingMedicines, setLoadingMedicines] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingPrescription, setLoadingPrescription] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!appointmentId) return;

    async function loadData() {
      try {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("hospital_token");
        const appointmentResponse = await fetch(
          `${BASE_URL}/appointments/${appointmentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!appointmentResponse.ok) {
          throw new Error("Failed to load appointment details.");
        }

        const appointmentData = await appointmentResponse.json();
        setAppointment(appointmentData);

        if (isCompleted(appointmentData.status)) {
          setLoadingPrescription(true);
          try {
            const prescriptionResponse = await fetch(
              `${BASE_URL}/prescriptions/appointment/${appointmentId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (prescriptionResponse.ok) {
              const prescriptionData = await prescriptionResponse.json();
              setSavedPrescription(prescriptionData);
            } else if (prescriptionResponse.status === 404) {
              setSavedPrescription(null);
            }
          } finally {
            setLoadingPrescription(false);
          }
        }
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Failed to load consultation."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [appointmentId]);
useEffect(() => {
  async function loadPharmacyMedicines() {
    try {
      setLoadingMedicines(true);

      const data = await pharmacyApi.medicines();

      setPharmacyMedicines(data);
    } catch (err) {
      console.error(
        "Failed to load pharmacy medicines:",
        err
      );
    } finally {
      setLoadingMedicines(false);
    }
  }

  loadPharmacyMedicines();
}, []);
  function updateMedicine(
    index: number,
    field: keyof MedicineLine,
    value: string
  ) {
    setMedicines((prev) =>
      prev.map((med, i) => (i === index ? { ...med, [field]: value } : med))
    );
  }

  function removeMedicine(index: number) {
    if (medicines.length <= 1) {
      setMedicines([
        {
  medicine_id: "",
  medicine_name: "",
  quantity: "",
  dosage: "",
  duration: "",
},
      ]);
      return;
    }
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  }

  function addMedicine() {
    setMedicines((prev) => [
      ...prev,
      {
  medicine_id: "",
  medicine_name: "",
  quantity: "",
  dosage: "",
  duration: "",
},
    ]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!appointment) return;

    try {
      setSaving(true);
      setError("");

      await prescriptionsApi.create({
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        consultation_notes: notes,
        medicines: medicines.filter(
  (m) => m.medicine_id && m.medicine_name?.trim()
),
      });

      setSaved(true);

      const token = localStorage.getItem("hospital_token");
      const prescriptionResponse = await fetch(
        `${BASE_URL}/prescriptions/appointment/${appointment.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (prescriptionResponse.ok) {
        const prescriptionData = await prescriptionResponse.json();
        setSavedPrescription(prescriptionData);
      }

      setAppointment((prev) =>
        prev ? { ...prev, status: "completed" } : prev
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to save consultation."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card py-16 text-center text-slate-400">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
        <p className="mt-2 text-xs">Loading consultation record...</p>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-800 ring-1 ring-rose-200">
        {error}
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="card p-8 text-center text-sm text-slate-500">
        Appointment not found.
      </div>
    );
  }

  // Completed Consultation View
  if (isCompleted(appointment.status) || saved) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
              <CheckCircle className="h-3.5 w-3.5" />
              Completed Consultation & Prescription
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
              Consultation Slip: {appointment.patient_name}
            </h1>
            <p className="text-xs text-slate-500">
              Official medical visit transcript and prescription document.
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-outline inline-flex items-center gap-1.5 text-xs"
            >
              Print Prescription Slip
            </button>
            <Link
              to="/doctor/appointments"
              className="btn-primary inline-flex items-center gap-1.5 text-xs"
            >
              Back to Appointments
            </Link>
          </div>
        </div>

        {/* Appointment & Patient Info Card */}
        <div className="card p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Patient Name
              </span>
              <div className="mt-0.5 text-sm font-bold text-teal-950">
                {appointment.patient_name || "—"}
              </div>
              <div className="text-xs text-slate-500">{appointment.patient_phone}</div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Visit Date & Shift
              </span>
              <div className="mt-0.5 text-sm font-bold text-teal-950">
                {formatDate(appointment.appointment_date)}
              </div>
              <div className="text-xs text-teal-800 font-medium">
                {getShiftLabel(appointment)}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Reason for Visit
              </span>
              <div className="mt-0.5 text-xs text-slate-700">
                {appointment.reason || "General Consultation"}
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Notes Card */}
        <div className="card p-6">
          <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            Clinical Consultation Notes
          </h3>
          <div className="mt-3 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-800 border border-slate-200">
            {savedPrescription?.consultation_notes ? (
              <p className="whitespace-pre-wrap">
                {savedPrescription.consultation_notes}
              </p>
            ) : (
              <p className="italic text-slate-400">No notes recorded.</p>
            )}
          </div>
        </div>

        {/* Prescription Table Card */}
        <div className="card p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-teal-950 uppercase">
              <Pill className="h-4 w-4 text-teal-700" />
              Prescribed Medications
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Rx Code: {savedPrescription?.id.slice(0, 8) || "RX-GEN"}
            </span>
          </div>

          {!savedPrescription || savedPrescription.details.length === 0 ? (
            <p className="mt-4 text-xs italic text-slate-400">
              No medications prescribed during this visit.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Medicine</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Dosage / Instructions</th>
                    <th className="px-4 py-3">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {savedPrescription.details.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3 font-bold text-teal-950">
                        {m.medicine_name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {m.quantity || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {m.dosage || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {m.duration || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active Consultation Form View
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <Stethoscope className="h-3.5 w-3.5" />
            Live Consultation In Session
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Consultation: {appointment.patient_name}
          </h1>
          <p className="text-xs text-slate-500">
            Record physician observations, diagnosis, and digital prescription lines.
          </p>
        </div>

        <Link
          to="/doctor/appointments"
          className="btn-outline self-start sm:self-auto text-xs"
        >
          ← Back to Appointments
        </Link>
      </div>

      {/* Appointment Information Card */}
      <div className="card p-6">
        <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
          Patient & Shift Context
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <span className="text-[11px] text-slate-400">Patient</span>
            <div className="font-bold text-teal-950 text-sm">
              {appointment.patient_name || "—"}
            </div>
            <div className="text-xs text-slate-500">{appointment.patient_phone}</div>
          </div>

          <div>
            <span className="text-[11px] text-slate-400">Date & OPD Shift</span>
            <div className="font-bold text-teal-950 text-sm">
              {formatDate(appointment.appointment_date)}
            </div>
            <div className="text-xs text-teal-800 font-medium">
              {getShiftLabel(appointment)}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-slate-400">Reason for Consultation</span>
            <div className="text-xs text-slate-700">
              {appointment.reason || "General checkup"}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Clinical Notes */}
        <div className="card p-6">
          <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
            Clinical Examination & Diagnostic Notes
          </label>
          <p className="text-xs text-slate-500 mt-1">
            Include symptoms, blood pressure, findings, and clinical instructions.
          </p>
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Document patient history, clinical vitals, differential diagnosis, and lifestyle advice..."
            className="input-field mt-3 text-xs"
          />
        </div>

        {/* Prescription Builder */}
        <div className="card p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold tracking-wider text-teal-950 uppercase">
                Prescription Medicines
              </h3>
              <p className="text-xs text-slate-500">
                Medicines prescribed will appear in the pharmacy sales dispatch system.
              </p>
            </div>

            <button
              type="button"
              onClick={addMedicine}
              className="btn-outline inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Medicine Line
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {medicines.map((med, index) => (
              <div
                key={index}
                className="grid grid-cols-1 items-center gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-12"
              >
                <div className="sm:col-span-4">
  <select
    value={med.medicine_id}
    disabled={loadingMedicines}
    required
    onChange={(e) => {
      const medicineId = e.target.value;

      const selectedMedicine =
        pharmacyMedicines.find(
          (medicine) => medicine.id === medicineId
        );

      setMedicines((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                medicine_id: medicineId,
                medicine_name:
                  selectedMedicine?.name || "",
              }
            : item
        )
      );
    }}
    className="input-field text-xs"
  >
    <option value="">
      {loadingMedicines
        ? "Loading pharmacy medicines..."
        : "Select medicine..."}
    </option>

    {pharmacyMedicines.map((medicine) => (
      <option
        key={medicine.id}
        value={medicine.id}
      >
        {medicine.name}
      </option>
    ))}
  </select>
</div>

                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Qty (e.g. 10 tabs)"
                    value={med.quantity || ""}
                    onChange={(e) =>
                      updateMedicine(index, "quantity", e.target.value)
                    }
                    className="input-field text-xs"
                  />
                </div>

                <div className="sm:col-span-3">
                  <input
                    type="text"
                    placeholder="Dosage (e.g. 1 tab TDS pc)"
                    value={med.dosage || ""}
                    onChange={(e) =>
                      updateMedicine(index, "dosage", e.target.value)
                    }
                    className="input-field text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Duration (5 days)"
                    value={med.duration || ""}
                    onChange={(e) =>
                      updateMedicine(index, "duration", e.target.value)
                    }
                    className="input-field text-xs"
                  />
                </div>

                <div className="flex justify-center sm:col-span-1">
                  <button
                    type="button"
                    onClick={() => removeMedicine(index)}
                    title="Remove item"
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/doctor/appointments"
            className="btn-outline text-xs"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary inline-flex items-center gap-2 py-3 px-6 shadow-md shadow-teal-900/10 text-xs disabled:opacity-60"
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Completing Visit...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Save & Issue Prescription
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}