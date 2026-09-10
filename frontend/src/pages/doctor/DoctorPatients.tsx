import { useEffect, useState } from "react";

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

function formatStatus(status?: string) {
  if (!status) return "Unknown";

  return (
    status.charAt(0).toUpperCase() +
    status.slice(1)
  );
}

export default function DoctorPatients() {
  const [patients, setPatients] =
    useState<DoctorPatient[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [selectedPatient, setSelectedPatient] =
    useState<DoctorPatient | null>(null);

  const [selectedAppointment, setSelectedAppointment] =
    useState<PatientAppointment | null>(null);

  async function loadPatients() {
    try {
      setLoading(true);
      setError("");

      const token =
        localStorage.getItem("hospital_token");

      const response = await fetch(
        `${BASE_URL}/doctors/patients`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load patients."
        );
      }

      setPatients(data);

      // Keep selected patient fresh after refresh.
      if (selectedPatient) {
        const updatedPatient = data.find(
          (patient: DoctorPatient) =>
            patient.id === selectedPatient.id
        );

        setSelectedPatient(
          updatedPatient || null
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load patients."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients();
  }, []);

  const filteredPatients = patients.filter(
    (patient) => {
      const searchText =
        search.trim().toLowerCase();

      if (!searchText) return true;

      return (
        patient.full_name
          .toLowerCase()
          .includes(searchText) ||
        patient.phone
          ?.toLowerCase()
          .includes(searchText) ||
        patient.email
          ?.toLowerCase()
          .includes(searchText)
      );
    }
  );

  function openPatientHistory(
    patient: DoctorPatient
  ) {
    setSelectedPatient(patient);
    setSelectedAppointment(null);
  }

  function openCheckup(
    appointment: PatientAppointment
  ) {
    setSelectedAppointment(appointment);
  }

  function closeHistory() {
    setSelectedPatient(null);
    setSelectedAppointment(null);
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-teal-950">
            My Patients
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View your patients and their previous
            checkups.
          </p>
        </div>

        <button
          type="button"
          onClick={loadPatients}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-teal-950 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <label className="text-sm font-medium text-slate-700">
          Search Patients
        </label>

        <input
          type="text"
          className="input-field mt-2 w-full max-w-md"
          placeholder="Search by name, phone or email..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

        <p className="mt-3 text-sm text-slate-500">
          Showing {filteredPatients.length} of{" "}
          {patients.length} patients
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* Patient list */}
      {loading ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">
            Loading patients...
          </p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="font-medium text-slate-800">
            No patients found
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Patients with appointments assigned to
            you will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-4 font-medium text-slate-600">
                    Patient
                  </th>

                  <th className="px-5 py-4 font-medium text-slate-600">
                    Age
                  </th>

                  <th className="px-5 py-4 font-medium text-slate-600">
                    Contact
                  </th>

                  <th className="px-5 py-4 font-medium text-slate-600">
                    Appointments
                  </th>

                  <th className="px-5 py-4 font-medium text-slate-600">
                    Last Appointment
                  </th>

                  <th className="px-5 py-4 text-right font-medium text-slate-600">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredPatients.map(
                  (patient) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800">
                          {patient.full_name}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          ID:{" "}
                          {patient.id.slice(0, 8)}
                          ...
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {patient.age ?? "—"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="text-slate-700">
                          {patient.phone || "—"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {patient.email || "—"}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {patient.appointment_count}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(
                          patient.last_appointment_date
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            openPatientHistory(
                              patient
                            )
                          }
                          className="rounded-md border border-teal-700 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
                        >
                          View History
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Patient history */}
      {selectedPatient && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-teal-950">
                {selectedPatient.full_name}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Patient history
              </p>
            </div>

            <button
              type="button"
              onClick={closeHistory}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          {/* Patient information */}
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Age
              </p>

              <p className="mt-1 font-medium text-slate-800">
                {selectedPatient.age ?? "—"}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Phone
              </p>

              <p className="mt-1 font-medium text-slate-800">
                {selectedPatient.phone ||
                  "—"}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Email
              </p>

              <p className="mt-1 break-all font-medium text-slate-800">
                {selectedPatient.email ||
                  "—"}
              </p>
            </div>
          </div>

          {/* Appointment history */}
          <div className="mt-7">
            <h3 className="text-base font-semibold text-teal-950">
              Previous Checkups
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Select a completed visit to see the
              consultation and medicines prescribed
              during that visit.
            </p>

            {selectedPatient.appointments
              .length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No appointment history found.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {selectedPatient.appointments.map(
                  (appointment) => {
                    const completed =
                      String(
                        appointment.status
                      ).toLowerCase() ===
                      "completed";

                    return (
                      <div
                        key={appointment.id}
                        className="rounded-lg border border-slate-200 p-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-slate-800">
                              {formatDate(
                                appointment.appointment_date
                              )}
                            </p>

                            <p className="mt-1 text-sm text-slate-600">
                              <span className="font-medium">
                                Reason:
                              </span>{" "}
                              {appointment.reason ||
                                "Not provided"}
                            </p>

                            <p className="mt-1 text-sm text-slate-600">
                              <span className="font-medium">
                                Status:
                              </span>{" "}
                              {formatStatus(
                                appointment.status
                              )}
                            </p>
                          </div>

                          {completed ? (
                            <button
                              type="button"
                              onClick={() =>
                                openCheckup(
                                  appointment
                                )
                              }
                              className="rounded-md border border-teal-700 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
                            >
                              View Checkup
                            </button>
                          ) : (
                            <span className="text-sm text-slate-400">
                              No completed checkup
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* Selected checkup */}
          {selectedAppointment && (
            <div className="mt-7 rounded-xl border border-teal-100 bg-slate-50 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-teal-950">
                    Checkup Details
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {formatDate(
                      selectedAppointment.appointment_date
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedAppointment(null)
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              {/* Visit details */}
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-white p-4">
                  <p className="text-xs text-slate-500">
                    Date
                  </p>

                  <p className="mt-1 font-medium text-slate-800">
                    {formatDate(
                      selectedAppointment.appointment_date
                    )}
                  </p>
                </div>

                <div className="rounded-lg bg-white p-4">
                  <p className="text-xs text-slate-500">
                    Reason for Visit
                  </p>

                  <p className="mt-1 font-medium text-slate-800">
                    {selectedAppointment.reason ||
                      "Not provided"}
                  </p>
                </div>
              </div>

              {/* Consultation notes */}
              <div className="mt-5 rounded-lg bg-white p-5">
                <h4 className="text-sm font-semibold text-teal-950">
                  Consultation Notes
                </h4>

                <div className="mt-3 rounded-lg bg-slate-50 p-4">
                  {selectedAppointment
                    .consultation
                    ?.consultation_notes ? (
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {
                        selectedAppointment
                          .consultation
                          .consultation_notes
                      }
                    </p>
                  ) : (
                    <p className="text-sm italic text-slate-500">
                      No consultation notes were
                      recorded.
                    </p>
                  )}
                </div>
              </div>

              {/* Prescription */}
              <div className="mt-5 rounded-lg bg-white p-5">
                <h4 className="text-sm font-semibold text-teal-950">
                  Prescription
                </h4>

                {!selectedAppointment
                  .consultation ||
                selectedAppointment.consultation
                  .medicines.length === 0 ? (
                  <div className="mt-3 rounded-lg bg-slate-50 p-4">
                    <p className="text-sm italic text-slate-500">
                      No medicines were prescribed
                      during this checkup.
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
                        {selectedAppointment.consultation.medicines.map(
                          (medicine) => (
                            <tr key={medicine.id}>
                              <td className="px-4 py-3 font-medium text-slate-800">
                                {
                                  medicine.medicine_name
                                }
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}