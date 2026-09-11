import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  Pill,
  CheckCircle,
  Refresh,
  ShieldCheck,
  X,
  ArrowRight,
} from "../../components/icons/Icons";

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  "http://localhost:5000/api";

interface Medicine {
  id: string;
  medicine_name: string;
  quantity: string | null;
  dosage: string | null;
  duration: string | null;
}

interface Consultation {
  id: string;
  consultation_notes: string | null;
  created_at: string;
  medicines: Medicine[];
}

interface PatientAppointment {
  id: string;
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason?: string | null;
  consultation?: Consultation | null;
}

interface DoctorPatient {
  id: string;
  full_name: string;
  age: number | null;
  phone: string | null;
  email: string | null;
  appointment_count: number;
  last_appointment_date: string | null;
  appointments: PatientAppointment[];
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

export default function DoctorPatients() {
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<DoctorPatient | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<PatientAppointment | null>(null);

  async function loadPatients() {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("hospital_token");
      const response = await fetch(`${BASE_URL}/doctors/patients`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to load patient records.");
      }

      setPatients(data);
      if (selectedPatient) {
        const updated = data.find((p: DoctorPatient) => p.id === selectedPatient.id);
        setSelectedPatient(updated || null);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load patients.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients();
  }, []);

  const filteredPatients = patients.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Electronic Health Records (EHR)
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Patient Directory ({patients.length})
          </h1>
          <p className="text-xs text-slate-500">
            Access previous consultations, diagnostic histories, and prescriptions prescribed to your patients.
          </p>
        </div>

        <button
          type="button"
          onClick={loadPatients}
          disabled={loading}
          className="btn-outline inline-flex items-center gap-2 text-xs"
        >
          <Refresh className="h-3.5 w-3.5" />
          Refresh Registry
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
            placeholder="Search patients by full name, phone number, or email..."
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

      {/* Patient Records Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Patient Name</th>
                <th className="px-5 py-3.5">Age</th>
                <th className="px-5 py-3.5">Contact Details</th>
                <th className="px-5 py-3.5">Total Visits</th>
                <th className="px-5 py-3.5">Last Appointment</th>
                <th className="px-5 py-3.5 text-right">Medical Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
                    <p className="mt-2">Loading clinical patient records...</p>
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No patient records found.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 font-bold text-teal-900">
                          {patient.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-teal-950">
                            {patient.full_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            MRN: {patient.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {patient.age !== null ? `${patient.age} yrs` : "—"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-slate-800">{patient.phone || "—"}</div>
                      <div className="text-[10px] text-slate-400">{patient.email || "—"}</div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-block rounded-full bg-teal-50 px-2.5 py-0.5 font-bold text-teal-800">
                        {patient.appointment_count} {patient.appointment_count === 1 ? "visit" : "visits"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {formatDate(patient.last_appointment_date)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient(patient);
                          setSelectedAppointment(null);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-teal-600 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-2xs hover:bg-teal-50"
                      >
                        <FileText className="h-3.5 w-3.5 text-teal-700" />
                        <span>View EHR History</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient History Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="card max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="inline-block rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold text-teal-800 uppercase ring-1 ring-teal-200">
                  Patient Medical Dossier
                </span>
                <h3 className="mt-1 text-xl font-bold text-teal-950">
                  {selectedPatient.full_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Medical Record Number: {selectedPatient.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPatient(null);
                  setSelectedAppointment(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Patient Demographic Summary */}
            <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
              <div>
                <span className="text-slate-400">Age</span>
                <div className="font-bold text-teal-950">
                  {selectedPatient.age ? `${selectedPatient.age} years` : "Not recorded"}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Phone</span>
                <div className="font-bold text-teal-950">
                  {selectedPatient.phone || "—"}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Email</span>
                <div className="font-bold text-teal-950 truncate">
                  {selectedPatient.email || "—"}
                </div>
              </div>
            </div>

            {/* Checkup Visits History */}
            <div className="mt-6">
              <h4 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                Consultation & Visit Log
              </h4>

              {selectedPatient.appointments.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">
                  No prior appointment records found.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {selectedPatient.appointments.map((app) => {
                    const isCompleted =
                      String(app.status).toLowerCase() === "completed";

                    return (
                      <div
                        key={app.id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-teal-950 text-xs">
                              {formatDate(app.appointment_date)}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                isCompleted
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {app.status}
                            </span>
                          </div>
                          {app.reason && (
                            <p className="mt-1 text-xs text-slate-600">
                              <strong className="text-slate-700">Reason:</strong> {app.reason}
                            </p>
                          )}
                        </div>

                        {isCompleted && (
                          <button
                            type="button"
                            onClick={() => setSelectedAppointment(app)}
                            className="btn-outline self-start sm:self-auto text-xs py-1.5 px-3"
                          >
                            View Clinical Notes
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Specific Consultation Details */}
            {selectedAppointment && (
              <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50/30 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-teal-100 pb-3">
                  <h4 className="font-bold text-teal-950 text-sm">
                    Consultation on {formatDate(selectedAppointment.appointment_date)}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setSelectedAppointment(null)}
                    className="text-xs font-semibold text-teal-800 hover:underline"
                  >
                    Hide
                  </button>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-slate-700 uppercase">
                    Physician Notes
                  </h5>
                  <div className="mt-1.5 rounded-xl bg-white p-3.5 text-xs text-slate-700 border border-slate-200">
                    {selectedAppointment.consultation?.consultation_notes || (
                      <span className="text-slate-400 italic">No notes recorded.</span>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-slate-700 uppercase">
                    Prescribed Medication
                  </h5>
                  {!selectedAppointment.consultation ||
                  selectedAppointment.consultation.medicines.length === 0 ? (
                    <p className="mt-1 text-xs text-slate-400 italic">
                      No medications prescribed for this visit.
                    </p>
                  ) : (
                    <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Medicine</th>
                            <th className="px-3 py-2 font-semibold">Dosage</th>
                            <th className="px-3 py-2 font-semibold">Duration</th>
                            <th className="px-3 py-2 font-semibold">Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedAppointment.consultation.medicines.map((med) => (
                            <tr key={med.id}>
                              <td className="px-3 py-2 font-medium text-teal-950">
                                {med.medicine_name}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {med.dosage || "—"}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {med.duration || "—"}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {med.quantity || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}