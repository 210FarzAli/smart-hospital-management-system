import { useEffect, useState } from "react";
import { laboratoryApi } from "../../lib/apiClient";
import type { LabBooking, LabTest } from "../../lib/types";
import {
  Calendar,
  Search,
  Plus,
  CheckCircle,
  Clock,
  MapPin,
  FileText,
  ShieldCheck,
  X,
  Phone,
} from "../../components/icons/Icons";

export default function LaboratoryAppointments() {
  const [bookings, setBookings] = useState<LabBooking[]>([]);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Walk-in modal
  const [modalOpen, setModalOpen] = useState(false);
  const [walkinName, setWalkinName] = useState("");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [walkinAge, setWalkinAge] = useState("");
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [b, t] = await Promise.all([
        laboratoryApi.adminBookings(),
        laboratoryApi.tests(),
      ]);
      setBookings(b || []);
      setTests(t || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await laboratoryApi.updateStatus(id, status);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const handleWalkinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTests.length === 0) {
      alert("Please select at least one test.");
      return;
    }

    setSubmitting(true);
    try {
      await laboratoryApi.walkIn({
        patient_name: walkinName,
        patient_phone: walkinPhone,
        patient_age: walkinAge ? parseInt(walkinAge, 10) : undefined,
        test_ids: selectedTests,
        notes: "Walk-in Reception Registration",
      });
      setModalOpen(false);
      setWalkinName("");
      setWalkinPhone("");
      setWalkinAge("");
      setSelectedTests([]);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create walk-in registration");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = bookings.filter((b) => {
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const matchType = typeFilter === "all" || b.service_type === typeFilter;
    const q = search.toLowerCase();
    const matchSearch =
      b.patient_name.toLowerCase().includes(q) ||
      (b.tracking_id && b.tracking_id.toLowerCase().includes(q)) ||
      b.patient_phone.toLowerCase().includes(q);
    return matchStatus && matchType && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Central Sample Intake Desk
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Bookings & Sample Intake ({bookings.length})
          </h1>
          <p className="text-xs text-slate-500">
            Accept samples, dispatch phlebotomists for home collections, and assign laboratory IDs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="btn-primary inline-flex items-center gap-2 text-xs shadow-md shadow-teal-900/10"
        >
          <Plus className="h-4 w-4" />
          Register Walk-In Patient
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by tracking code, patient name, or phone..."
            className="input-field pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-field py-1.5 text-xs w-auto"
          >
            <option value="all">All Modes</option>
            <option value="in_clinic">In-Clinic Only</option>
            <option value="home_service">Home Service Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field py-1.5 text-xs w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="sample_collected">Sample Collected</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Tracking ID</th>
                <th className="px-5 py-3.5">Patient Details</th>
                <th className="px-5 py-3.5">Mode & Address</th>
                <th className="px-5 py-3.5">Scheduled Date</th>
                <th className="px-5 py-3.5">Bill Amount</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Intake Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Loading laboratory bookings...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No bookings found matching current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-teal-950">
                      <span className="bg-teal-50 px-2 py-1 rounded border border-teal-200">
                        {b.tracking_id}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-bold text-teal-950">{b.patient_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {b.patient_phone} {b.patient_age ? `• ${b.patient_age} yrs` : ""}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {b.service_type === "home_service" ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800 ring-1 ring-blue-200">
                            <MapPin className="h-3 w-3" />
                            Home Service
                          </span>
                          <div
                            className="text-[11px] text-slate-600 max-w-[220px] truncate"
                            title={b.home_address || ""}
                          >
                            {b.home_address}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800 ring-1 ring-teal-200">
                          In-Clinic Lab
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-slate-600 font-medium">
                      {b.booking_date ? new Date(b.booking_date).toLocaleDateString() : "Immediate"}
                    </td>

                    <td className="px-5 py-4 font-bold text-teal-950">
                      Rs. {Number(b.total_amount).toLocaleString()}
                      <div className="text-[10px] font-normal text-emerald-700">Cash / Physical</div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          b.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : b.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : b.status === "sample_collected"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {b.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {b.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(b.id, "sample_collected")}
                            className="rounded-lg bg-teal-800 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-teal-700 transition"
                          >
                            Mark Collected
                          </button>
                        )}
                        {b.status === "sample_collected" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(b.id, "in_progress")}
                            className="rounded-lg bg-blue-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-600 transition"
                          >
                            Start Analysis
                          </button>
                        )}
                        {b.status === "in_progress" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(b.id, "completed")}
                            className="rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-600 transition"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Walk-in Registration Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-teal-950">
                Register Walk-in Lab Patient
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleWalkinSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-700">Patient Name *</label>
                <input
                  type="text"
                  required
                  value={walkinName}
                  onChange={(e) => setWalkinName(e.target.value)}
                  placeholder="e.g. Asad Khan"
                  className="input-field mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-700">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="input-field mt-1"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-700">Age</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={walkinAge}
                    onChange={(e) => setWalkinAge(e.target.value)}
                    placeholder="e.g. 40"
                    className="input-field mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Select Tests for Walk-in Patient ({selectedTests.length})
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2">
                  {tests.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedTests.includes(t.id)}
                          onChange={() =>
                            setSelectedTests((prev) =>
                              prev.includes(t.id) ? prev.filter((i) => i !== t.id) : [...prev, t.id]
                            )
                          }
                          className="rounded border-slate-300 text-teal-600"
                        />
                        <span className="font-semibold text-slate-800">{t.name}</span>
                      </div>
                      <span className="font-bold text-teal-950">Rs. {Number(t.price).toLocaleString()}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary flex-1 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 py-2 text-xs font-bold"
                >
                  {submitting ? "Issuing Token..." : "Issue Lab Token"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
