import { useState, FormEvent } from "react";
import { receptionApi } from "../../lib/apiClient";
import type { ReceptionSearchResult } from "../../lib/types";
import {
  Search,
  Calendar,
  Activity,
  FileText,
  Phone,
  Clock,
  CheckCircle,
  Building,
  DollarSign,
  AlertCircle,
  X,
  UserCheck,
} from "../../components/icons/Icons";

export default function ReceptionSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<ReceptionSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Patient 360 Profile Modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  async function openPatientProfile(idOrPhone: string) {
    if (!idOrPhone) return;
    setLoadingProfile(true);
    setSelectedProfile(null);
    setProfileModalOpen(true);
    try {
      const data = await receptionApi.patientDetails(idOrPhone);
      setSelectedProfile(data);
    } catch (err: any) {
      alert(err.message || "Failed to load patient profile.");
      setProfileModalOpen(false);
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await receptionApi.search(searchTerm.trim());
      setResults(res);
    } catch (err) {
      console.error("Failed to perform reception lookup:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn(id: string) {
    try {
      await receptionApi.checkIn(id);
      if (searchTerm.trim()) {
        const res = await receptionApi.search(searchTerm.trim());
        setResults(res);
      }
    } catch (err: any) {
      alert(err.message || "Failed to check in appointment.");
    }
  }

  const appts = results?.appointments || [];
  const labs = results?.labBookings || [];
  const orders = results?.pharmacyOrders || [];
  const totalFound = appts.length + labs.length + orders.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
          Patient Lookup
        </h1>
        <p className="text-xs text-slate-500">
          Central front desk operational search across patient phone numbers, appointment codes, laboratory tracking IDs, and pharmacy orders.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <form onSubmit={handleSearch} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            Enter Patient Phone, Patient Code, Appointment ID, Lab Tracking ID, or Pharmacy Order ID:
          </label>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="e.g. 03001234567, APT-..., LAB-2026-..., ORD-..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-xs shrink-0 px-6 py-2.5"
            >
              {loading ? "Searching..." : "Search Records"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">Supported Identifiers:</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px]">Phone Number</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px]">P-XXXX (Patient Code)</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px]">APT-XXXX (Appointment Code)</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px]">LAB-XXXX (Lab Tracking ID)</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px]">ORD-XXXX (Pharmacy Order Code)</span>
          </div>
        </form>
      </div>

      {/* Results View */}
      {searched && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>
              Search Results for <span className="font-mono font-bold text-teal-900">"{searchTerm}"</span>
            </span>
            <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-teal-800">
              {totalFound} total records found
            </span>
          </div>

          {totalFound === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
              <AlertCircle className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="font-bold text-slate-700">No matching hospital records found</p>
              <p className="mt-1 text-slate-400">Please verify the code or phone number entered above.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 1. Appointments Section */}
              {appts.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 font-bold text-teal-950 text-xs">
                    <Calendar className="h-4 w-4 text-teal-600" />
                    <span>Doctor Appointments ({appts.length})</span>
                  </div>

                  <div className="mt-3 divide-y divide-slate-100">
                    {appts.map((a: any) => (
                      <div key={a.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-teal-900">{a.appointment_code}</span>
                            <span className="text-slate-400">•</span>
                            <button
                              type="button"
                              onClick={() => openPatientProfile(a.patient_phone || a.patient_code)}
                              className="font-semibold text-teal-800 hover:text-teal-950 hover:underline"
                            >
                              {a.patient_name}
                            </button>
                            <span className="text-slate-500">({a.patient_phone})</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Dr. {a.doctor_name} ({a.department_name}) — Date: {String(a.appointment_date).slice(0, 10)} at {a.appointment_time}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openPatientProfile(a.patient_phone || a.patient_code)}
                            className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-800 hover:bg-teal-100 transition"
                          >
                            View Patient Profile
                          </button>

                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              a.status === "checked_in"
                                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                : a.status === "completed"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
                            }`}
                          >
                            {a.status.replace("_", " ")}
                          </span>

                          {a.status === "confirmed" && (
                            <button
                              type="button"
                              onClick={() => handleCheckIn(a.id)}
                              className="rounded-lg bg-teal-800 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-teal-900 transition"
                            >
                              Mark Check-In
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Laboratory Bookings Section */}
              {labs.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 font-bold text-teal-950 text-xs">
                    <Activity className="h-4 w-4 text-teal-600" />
                    <span>Laboratory Bookings ({labs.length})</span>
                  </div>

                  <div className="mt-3 divide-y divide-slate-100">
                    {labs.map((lb: any) => (
                      <div key={lb.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              {lb.tracking_id}
                            </span>
                            <span className="text-slate-400">•</span>
                            <button
                              type="button"
                              onClick={() => openPatientProfile(lb.patient_phone || lb.tracking_id)}
                              className="font-semibold text-teal-800 hover:text-teal-950 hover:underline"
                            >
                              {lb.patient_name}
                            </button>
                            <span className="text-slate-500">({lb.patient_phone})</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Service: {lb.service_type === "home_service" ? "Home Sample Collection" : "In-Clinic Laboratory"} — Date: {String(lb.booking_date).slice(0, 10)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openPatientProfile(lb.patient_phone || lb.tracking_id)}
                            className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-800 hover:bg-teal-100 transition"
                          >
                            View Patient Profile
                          </button>

                          <span className="font-bold text-teal-950 text-xs">
                            Rs. {Number(lb.total_amount).toLocaleString()}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              lb.status === "completed"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                            }`}
                          >
                            {lb.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Online Pharmacy Orders Section */}
              {orders.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 font-bold text-teal-950 text-xs">
                    <FileText className="h-4 w-4 text-teal-600" />
                    <span>Online Pharmacy Orders ({orders.length})</span>
                  </div>

                  <div className="mt-3 divide-y divide-slate-100">
                    {orders.map((o: any) => (
                      <div key={o.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-teal-900">{o.order_code}</span>
                            <span className="text-slate-400">•</span>
                            <button
                              type="button"
                              onClick={() => openPatientProfile(o.customer_phone)}
                              className="font-semibold text-teal-800 hover:text-teal-950 hover:underline"
                            >
                              {o.customer_name}
                            </button>
                            <span className="text-slate-500">({o.customer_phone})</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Delivery Address: {o.delivery_address}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openPatientProfile(o.customer_phone)}
                            className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-800 hover:bg-teal-100 transition"
                          >
                            View Patient Profile
                          </button>

                          <span className="font-bold text-teal-950 text-xs">
                            Rs. {Number(o.total_amount).toLocaleString()}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              o.status === "completed" || o.status === "delivered"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
                            }`}
                          >
                            {o.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Patient 360° Comprehensive Profile Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-800 text-white">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-teal-950">
                    Patient Profile & Visit History
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Reception operational overview (appointments, lab diagnostics, and pharmacy).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingProfile || !selectedProfile ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading complete patient records...
              </div>
            ) : (
              <div className="mt-4 space-y-6 text-xs">
                {/* Administrative boundary reminder */}
                <div className="rounded-xl bg-teal-50/70 p-3 text-[11px] text-teal-900 border border-teal-200/60">
                  <span className="font-bold">Front Desk Scope:</span> Administrative and tracking record lookup only. Clinical diagnoses and medical alterations require authorized Consultant Doctor or Laboratory specialist credentials.
                </div>

                {/* Demographics Card */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-extrabold text-teal-950">
                        {selectedProfile.patient?.full_name}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Patient Code: <span className="font-mono font-bold text-teal-800">{selectedProfile.patient?.patient_code || "N/A"}</span>
                      </p>
                    </div>
                    <span className="rounded-full bg-teal-100 px-2.5 py-0.5 font-bold text-teal-900 text-[10px]">
                      Registered Patient
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Phone:</span>
                      <span className="font-semibold text-slate-800">{selectedProfile.patient?.phone || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Email:</span>
                      <span className="font-semibold text-slate-800">{selectedProfile.patient?.email || "None"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Age / Gender:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedProfile.patient?.age ? `${selectedProfile.patient.age} yrs` : "--"} • {selectedProfile.patient?.gender || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">First Registered:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedProfile.patient?.created_at ? String(selectedProfile.patient.created_at).slice(0, 10) : "Recent"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Appointments History */}
                <div>
                  <h4 className="font-bold text-teal-950 mb-2 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-teal-700" />
                    Doctor Consultations & Visits ({selectedProfile.appointments?.length || 0})
                  </h4>
                  {selectedProfile.appointments?.length === 0 ? (
                    <p className="text-slate-400 text-[11px] italic">No previous doctor appointments found.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                      {selectedProfile.appointments.map((a: any) => (
                        <div key={a.id} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900">
                              Dr. {a.doctor_name} ({a.department_name})
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Code: <span className="font-mono">{a.appointment_code}</span> • Date: {String(a.appointment_date).slice(0, 10)} at {a.appointment_time}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">Rs. {a.consultation_fee}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                              {a.status.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Laboratory Tests History */}
                <div>
                  <h4 className="font-bold text-teal-950 mb-2 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-teal-700" />
                    Laboratory Bookings & Tests ({selectedProfile.labBookings?.length || 0})
                  </h4>
                  {selectedProfile.labBookings?.length === 0 ? (
                    <p className="text-slate-400 text-[11px] italic">No laboratory bookings recorded.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                      {selectedProfile.labBookings.map((b: any) => (
                        <div key={b.id} className="p-3 bg-white hover:bg-slate-50 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-teal-950 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                {b.tracking_id}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {b.service_type === "home_service" ? "🏠 Home Collection" : "🏥 In-Clinic"} • {String(b.booking_date).slice(0, 10)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-teal-950">Rs. {Number(b.total_amount).toLocaleString()}</span>
                              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase text-teal-800">
                                {b.status.replace("_", " ")}
                              </span>
                            </div>
                          </div>
                          {b.items && b.items.length > 0 && (
                            <div className="mt-1 space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              {b.items.map((i: any) => (
                                <div key={i.test_name} className="flex items-center justify-between text-[11px]">
                                  <span className="font-semibold text-slate-800">{i.test_name}</span>
                                  <div className="flex items-center gap-2">
                                    {i.result_value ? (
                                      <span className="font-bold text-teal-950 bg-white px-2 py-0.5 rounded border border-slate-200">
                                        Value: {i.result_value} {i.unit || ""}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 italic">Analysis Pending</span>
                                    )}
                                    <span className="text-slate-500">
                                      ({i.normal_range ? `Normal: ${i.normal_range}` : "Standard range"})
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Online Pharmacy Orders */}
                {selectedProfile.pharmacyOrders?.length > 0 && (
                  <div>
                    <h4 className="font-bold text-teal-950 mb-2 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-teal-700" />
                      Online Pharmacy Orders ({selectedProfile.pharmacyOrders.length})
                    </h4>
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                      {selectedProfile.pharmacyOrders.map((o: any) => (
                        <div key={o.id} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-teal-900">{o.order_code}</span>
                            <div className="text-[11px] text-slate-500">{o.delivery_address}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-teal-950">Rs. {Number(o.total_amount).toLocaleString()}</span>
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                              {o.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
