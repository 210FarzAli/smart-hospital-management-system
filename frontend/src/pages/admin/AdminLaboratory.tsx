import { useEffect, useState } from "react";
import { laboratoryApi } from "../../lib/apiClient";
import type { LabTest, LabBooking, LabBookingItem } from "../../lib/types";
import {
  Search,
  Plus,
  Edit,
  Trash,
  ShieldCheck,
  MapPin,
  X,
} from "../../components/icons/Icons";

export default function AdminLaboratory() {
  const [activeTab, setActiveTab] = useState<"bookings" | "tests" | "history">("bookings");
  const [tests, setTests] = useState<LabTest[]>([]);
  const [bookings, setBookings] = useState<LabBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // New/Edit test modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [testForm, setTestForm] = useState({
    name: "",
    test_code: "",
    category: "Hematology",
    sample_type: "Blood",
    price: 0,
    turnaround_hours: 24,
    normal_range: "",
    unit: "",
    description: "",
    is_home_collection_available: true,
  });

  // Selected Booking details & results entry modal
  const [selectedBooking, setSelectedBooking] = useState<LabBooking | null>(null);
  const [bookingModalLoading, setBookingModalLoading] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [resultsForm, setResultsForm] = useState<{
    [itemId: string]: {
      resultValue: string;
      status: "completed" | "in_progress" | "pending" | "normal" | "abnormal";
      remarks: string;
      normalRange: string;
      unit: string;
    };
  }>({});
  const [savingResults, setSavingResults] = useState(false);

  // Patient History state
  const [historySearch, setHistorySearch] = useState("");
  const [historyResults, setHistoryResults] = useState<LabBooking[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearched, setHistorySearched] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [testsRes, bookingsRes] = await Promise.all([
        laboratoryApi.tests(),
        laboratoryApi.adminBookings(),
      ]);
      setTests(testsRes);
      setBookings(bookingsRes);
    } catch (err) {
      console.error("Failed to load lab data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredBookings = bookings.filter((b) => {
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      b.patient_name.toLowerCase().includes(q) ||
      b.tracking_id.toLowerCase().includes(q) ||
      b.patient_phone.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const filteredTests = tests.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.test_code && t.test_code.toLowerCase().includes(q)) ||
      (t.category && t.category.toLowerCase().includes(q))
    );
  });

  const handleOpenAdd = () => {
    setEditingTest(null);
    setTestForm({
      name: "",
      test_code: "",
      category: "Hematology",
      sample_type: "Blood",
      price: 0,
      turnaround_hours: 24,
      normal_range: "",
      unit: "",
      description: "",
      is_home_collection_available: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (test: LabTest) => {
    setEditingTest(test);
    setTestForm({
      name: test.name,
      test_code: test.test_code || "",
      category: test.category || "Hematology",
      sample_type: test.sample_type || "Blood",
      price: Number(test.price) || 0,
      turnaround_hours: Number(test.turnaround_hours) || 24,
      normal_range: test.normal_range || "",
      unit: test.unit || "",
      description: test.description || "",
      is_home_collection_available: test.is_home_collection_available ?? true,
    });
    setModalOpen(true);
  };

  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTest) {
        await laboratoryApi.updateTest(editingTest.id, {
          name: testForm.name,
          category: testForm.category,
          sample_type: testForm.sample_type,
          price: testForm.price,
          turnaround_hours: testForm.turnaround_hours,
          normal_range: testForm.normal_range,
          unit: testForm.unit,
          description: testForm.description,
          is_home_collection_available: testForm.is_home_collection_available,
        });
      } else {
        await laboratoryApi.createTest({
          ...testForm,
          status: "active",
        });
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to save test.");
    }
  };

  const handleDeleteTest = async (id: string, name: string) => {
    if (!window.confirm(`Deactivate lab test "${name}"?`)) return;
    try {
      await laboratoryApi.updateTest(id, { status: "inactive" });
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to deactivate test.");
    }
  };

  // Open booking details & results entry modal
  const handleOpenBooking = async (bookingId: string) => {
    setBookingModalLoading(true);
    try {
      const fullBooking = await laboratoryApi.getBooking(bookingId);
      setSelectedBooking(fullBooking);
      setNewStatus(fullBooking.status);

      const initialResults: { [itemId: string]: any } = {};
      if (fullBooking.items) {
        fullBooking.items.forEach((item: LabBookingItem) => {
          initialResults[item.id] = {
            resultValue: item.result_value || "",
            status: item.result_status || "completed",
            remarks: item.remarks || "",
            normalRange: item.normal_range || "",
            unit: item.unit || "",
          };
        });
      }
      setResultsForm(initialResults);
    } catch (err: any) {
      alert(err.message || "Failed to load booking details.");
    } finally {
      setBookingModalLoading(false);
    }
  };

  // Update overall booking status
  const handleUpdateStatus = async () => {
    if (!selectedBooking) return;
    try {
      const updated = await laboratoryApi.updateStatus(selectedBooking.id, newStatus);
      setSelectedBooking((prev) => (prev ? { ...prev, status: updated.status } : null));
      loadData();
      alert(`Booking status updated to: ${newStatus}`);
    } catch (err: any) {
      alert(err.message || "Failed to update status.");
    }
  };

  // Save entered test results
  const handleSaveResults = async () => {
    if (!selectedBooking) return;
    setSavingResults(true);
    try {
      const payload = Object.entries(resultsForm).map(([itemId, data]) => ({
        itemId,
        resultValue: data.resultValue,
        status: data.status,
        remarks: data.remarks,
        normalRange: data.normalRange,
        unit: data.unit,
      }));

      await laboratoryApi.recordResults(selectedBooking.id, payload);
      const refreshed = await laboratoryApi.getBooking(selectedBooking.id);
      setSelectedBooking(refreshed);
      setNewStatus(refreshed.status);
      loadData();
      alert("Test findings and results recorded successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to save results.");
    } finally {
      setSavingResults(false);
    }
  };

  // Search patient history
  const handleSearchHistory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!historySearch.trim() || historySearch.trim().length < 3) {
      alert("Please enter at least 3 characters (phone number or patient name).");
      return;
    }
    setHistoryLoading(true);
    setHistorySearched(true);
    try {
      const records = await laboratoryApi.patientHistory({ search: historySearch.trim() });
      setHistoryResults(records);
    } catch (err: any) {
      alert(err.message || "Failed to search patient history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const completedCount = bookings.filter((b) => b.status === "completed" || b.status === "result_ready").length;
  const homeCount = bookings.filter((b) => b.service_type === "home_service").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Pathology Laboratory Administration
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Laboratory Management
          </h1>
          <p className="text-xs text-slate-500">
            Monitor patient diagnostic bookings, home sample collections, record clinical test results, and view patient history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "tests" && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="btn-primary inline-flex items-center gap-1.5 text-xs shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Lab Test</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="card p-5">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Bookings</div>
          <div className="mt-2 text-2xl font-extrabold text-teal-950">{bookings.length}</div>
          <div className="mt-1 text-xs text-slate-400">In-clinic & home requests</div>
        </div>

        <div className="card p-5">
          <div className="text-xs font-bold text-emerald-700 uppercase">Completed / Ready</div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700">{completedCount}</div>
          <div className="mt-1 text-xs text-slate-400">Pathologist verified</div>
        </div>

        <div className="card p-5">
          <div className="text-xs font-bold text-blue-700 uppercase">Home Collections</div>
          <div className="mt-2 text-2xl font-extrabold text-blue-800">{homeCount}</div>
          <div className="mt-1 text-xs text-slate-400">Phlebotomist dispatched</div>
        </div>

        <div className="card p-5">
          <div className="text-xs font-bold text-teal-800 uppercase">Active Catalog Tests</div>
          <div className="mt-2 text-2xl font-extrabold text-teal-950">{tests.length}</div>
          <div className="mt-1 text-xs text-slate-400">Configured test formulary</div>
        </div>
      </div>

      {/* Tab Selector & Filter Bar */}
      <div className="card p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("bookings")}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
              activeTab === "bookings"
                ? "bg-white text-teal-950 shadow-xs"
                : "text-slate-600 hover:text-teal-950"
            }`}
          >
            Diagnostic Bookings ({bookings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tests")}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
              activeTab === "tests"
                ? "bg-white text-teal-950 shadow-xs"
                : "text-slate-600 hover:text-teal-950"
            }`}
          >
            Tests Catalog ({tests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
              activeTab === "history"
                ? "bg-white text-teal-950 shadow-xs"
                : "text-slate-600 hover:text-teal-950"
            }`}
          >
            Patient Lab History
          </button>
        </div>

        {activeTab !== "history" && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, tracking ID..."
                className="input-field pl-9 text-xs"
              />
            </div>

            {activeTab === "bookings" && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field py-1.5 text-xs w-auto"
              >
                <option value="all">All Statuses</option>
                <option value="booked">Booked</option>
                <option value="sample_collection_pending">Collection Pending</option>
                <option value="sample_collected">Sample Collected</option>
                <option value="processing">Processing</option>
                <option value="result_ready">Result Ready</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            )}
          </div>
        )}
      </div>

      {/* Tab 1: Bookings Table */}
      {activeTab === "bookings" && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Tracking Code</th>
                  <th className="px-5 py-3.5">Patient Details</th>
                  <th className="px-5 py-3.5">Collection Mode</th>
                  <th className="px-5 py-3.5">Schedule</th>
                  <th className="px-5 py-3.5">Bill Amount</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Loading bookings...
                    </td>
                  </tr>
                ) : filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No laboratory bookings found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => handleOpenBooking(b.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-bold text-teal-950 bg-teal-50 px-2 py-1 rounded border border-teal-200">
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
                              Home Collection
                            </span>
                            <div className="text-[11px] text-slate-500 max-w-[180px] truncate" title={b.home_address || ""}>
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
                        {b.booking_time && <span className="text-[11px] text-slate-400 block">{b.booking_time}</span>}
                      </td>

                      <td className="px-5 py-4 font-bold text-teal-950">
                        Rs. {Number(b.total_amount).toLocaleString()}
                        <div className="text-[10px] font-normal text-emerald-700">Cash on Delivery / Walk-in</div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                            b.status === "completed" || b.status === "result_ready"
                              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                              : b.status === "processing" || b.status === "sample_collected"
                              ? "bg-blue-50 text-blue-800 ring-1 ring-blue-200"
                              : b.status === "cancelled"
                              ? "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
                              : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                          }`}
                        >
                          {b.status.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenBooking(b.id);
                          }}
                          className="btn-secondary py-1.5 px-3 text-[11px] font-bold text-teal-900"
                        >
                          Manage / Results
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Catalog Tests Table */}
      {activeTab === "tests" && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Test Name</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Sample Required</th>
                  <th className="px-5 py-3.5">Turnaround</th>
                  <th className="px-5 py-3.5">Home Collection</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Loading lab tests...
                    </td>
                  </tr>
                ) : filteredTests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No tests found matching search.
                    </td>
                  </tr>
                ) : (
                  filteredTests.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-teal-950">{t.name}</div>
                        {t.test_code && (
                          <div className="text-[11px] text-slate-400 font-mono">Code: {t.test_code}</div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700 font-semibold">
                          {t.category || "General"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-600 font-medium">
                        {t.sample_type || "Blood"}
                      </td>

                      <td className="px-5 py-4 text-slate-600 font-medium">
                        {t.turnaround_hours ? `${t.turnaround_hours} Hours` : "24 Hours"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            t.is_home_collection_available
                              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {t.is_home_collection_available ? "Yes (Home)" : "No (In-Clinic)"}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-bold text-teal-950">
                        Rs. {Number(t.price).toLocaleString()}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                            title="Edit Test"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTest(t.id, t.name)}
                            className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50"
                            title="Deactivate Test"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Patient Laboratory History */}
      {activeTab === "history" && (
        <div className="space-y-6">
          <div className="card p-6 bg-white">
            <h3 className="text-base font-bold text-teal-950">Look Up Patient Laboratory History</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter patient phone number or full name to view all previous laboratory appointments, tests taken, and clinical findings.
            </p>

            <form onSubmit={handleSearchHistory} className="mt-4 flex gap-3 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Enter phone (e.g. 03001234567) or patient name..."
                  className="input-field pl-10"
                />
              </div>
              <button
                type="submit"
                disabled={historyLoading}
                className="btn-primary py-2 px-5 text-xs font-bold"
              >
                {historyLoading ? "Searching..." : "Search Records"}
              </button>
            </form>
          </div>

          {historySearched && (
            <div className="space-y-4">
              {historyResults.length === 0 ? (
                <div className="card p-12 text-center text-slate-500">
                  No previous laboratory records found matching "{historySearch}".
                </div>
              ) : (
                historyResults.map((record) => (
                  <div key={record.id} className="card p-6 border-slate-200 bg-white space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-teal-950">{record.patient_name}</span>
                          <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {record.tracking_id}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              record.status === "completed" || record.status === "result_ready"
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-blue-50 text-blue-800"
                            }`}
                          >
                            {record.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Phone: {record.patient_phone} | Date: {new Date(record.booking_date).toLocaleDateString()} | Service:{" "}
                          {record.service_type === "home_service" ? "Home Collection" : "In-Clinic"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenBooking(record.id)}
                        className="btn-secondary py-1 px-3 text-xs font-bold"
                      >
                        View / Edit Findings
                      </button>
                    </div>

                    {/* Test line items table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                          <tr>
                            <th className="py-2 px-3">Test Name</th>
                            <th className="py-2 px-3">Result Finding</th>
                            <th className="py-2 px-3">Normal Range</th>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {record.items && record.items.length > 0 ? (
                            record.items.map((it) => (
                              <tr key={it.id}>
                                <td className="py-2.5 px-3 font-semibold text-slate-900">{it.test_name}</td>
                                <td className="py-2.5 px-3 font-bold text-teal-950">
                                  {it.result_value ? `${it.result_value} ${it.unit || ""}` : "Pending"}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500">
                                  {it.normal_range ? `${it.normal_range} ${it.unit || ""}` : "N/A"}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                      it.result_status === "abnormal"
                                        ? "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
                                        : it.result_status === "completed" || it.result_status === "normal"
                                        ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                                        : "bg-amber-50 text-amber-800"
                                    }`}
                                  >
                                    {it.result_status || "pending"}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-500">{it.remarks || "-"}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-3 text-center text-slate-400">
                                No test items recorded.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Booking Details & Result Recording Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-teal-950">
                  Manage Booking: <span className="font-mono text-teal-800">{selectedBooking.tracking_id}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Patient: {selectedBooking.patient_name} ({selectedBooking.patient_phone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-6 text-xs">
              {/* Workflow Status Bar */}
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="font-bold text-slate-700 block uppercase">Lifecycle Status</label>
                  <span className="text-[11px] text-slate-500">Update current state across the diagnostic process.</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="input-field py-1.5 text-xs font-semibold"
                  >
                    <option value="booked">Booked</option>
                    <option value="sample_collection_pending">Sample Collection Pending</option>
                    <option value="sample_collected">Sample Collected</option>
                    <option value="processing">Processing / In Lab</option>
                    <option value="result_ready">Result Ready</option>
                    <option value="completed">Completed / Verified</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleUpdateStatus}
                    className="btn-secondary py-1.5 px-3 text-xs font-bold"
                  >
                    Save Status
                  </button>
                </div>
              </div>

              {/* Patient Info Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Service Type</span>
                  <span className="font-bold text-teal-950">
                    {selectedBooking.service_type === "home_service" ? "Home Collection" : "In-Clinic Lab"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Appointment Date</span>
                  <span className="font-bold text-teal-950">
                    {new Date(selectedBooking.booking_date).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Amount</span>
                  <span className="font-bold text-teal-950">
                    Rs. {Number(selectedBooking.total_amount).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment</span>
                  <span className="font-bold text-emerald-700">Cash Physical</span>
                </div>
                {selectedBooking.home_address && (
                  <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Home Address</span>
                    <span className="text-slate-700">{selectedBooking.home_address}</span>
                  </div>
                )}
              </div>

              {/* Test Results Entry */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-sm text-teal-950">Record / Update Test Findings</h4>
                  <span className="text-[11px] text-slate-500">
                    Enter clinical values, flags (Normal / Abnormal), and remarks.
                  </span>
                </div>

                {selectedBooking.items && selectedBooking.items.length > 0 ? (
                  <div className="space-y-4">
                    {selectedBooking.items.map((item) => {
                      const formItem = resultsForm[item.id] || {
                        resultValue: "",
                        status: "completed",
                        remarks: "",
                        normalRange: item.normal_range || "",
                        unit: item.unit || "",
                      };

                      return (
                        <div key={item.id} className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-sm text-teal-950">{item.test_name}</span>
                              <div className="text-[11px] text-slate-500">
                                Normal: {item.normal_range || "N/A"} {item.unit || ""}
                              </div>
                            </div>
                            <span className="font-bold text-teal-900">Rs. {Number(item.price).toLocaleString()}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="font-bold text-[11px] text-slate-700 block">Measured Value</label>
                              <input
                                type="text"
                                value={formItem.resultValue}
                                onChange={(e) =>
                                  setResultsForm({
                                    ...resultsForm,
                                    [item.id]: { ...formItem, resultValue: e.target.value },
                                  })
                                }
                                placeholder="e.g. 13.5"
                                className="input-field mt-1"
                              />
                            </div>

                            <div>
                              <label className="font-bold text-[11px] text-slate-700 block">Clinical Assessment</label>
                              <select
                                value={formItem.status}
                                onChange={(e) =>
                                  setResultsForm({
                                    ...resultsForm,
                                    [item.id]: { ...formItem, status: e.target.value as any },
                                  })
                                }
                                className="input-field mt-1"
                              >
                                <option value="completed">Completed (Normal / General)</option>
                                <option value="normal">Normal Finding</option>
                                <option value="abnormal">Abnormal / Critical Alert</option>
                                <option value="in_progress">In Progress</option>
                                <option value="pending">Pending</option>
                              </select>
                            </div>

                            <div>
                              <label className="font-bold text-[11px] text-slate-700 block">Remarks / Notes</label>
                              <input
                                type="text"
                                value={formItem.remarks}
                                onChange={(e) =>
                                  setResultsForm({
                                    ...resultsForm,
                                    [item.id]: { ...formItem, remarks: e.target.value },
                                  })
                                }
                                placeholder="e.g. Verified by Dr. Asif"
                                className="input-field mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleSaveResults}
                        disabled={savingResults}
                        className="btn-primary py-2.5 px-6 text-xs font-bold shadow-md"
                      >
                        {savingResults ? "Saving Findings..." : "Save Findings & Complete"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-4">No test items attached to this booking.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Test Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-teal-950">
                {editingTest ? "Edit Laboratory Test" : "Create New Laboratory Test"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTest} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-700">Test Name *</label>
                <input
                  type="text"
                  required
                  value={testForm.name}
                  onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                  placeholder="e.g. Complete Blood Count (CBC)"
                  className="input-field mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-700">Test Code</label>
                  <input
                    type="text"
                    value={testForm.test_code}
                    onChange={(e) => setTestForm({ ...testForm, test_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. LT-CBC"
                    className="input-field mt-1"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700">Category</label>
                  <select
                    value={testForm.category}
                    onChange={(e) => setTestForm({ ...testForm, category: e.target.value })}
                    className="input-field mt-1"
                  >
                    <option value="Hematology">Hematology</option>
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Microbiology">Microbiology</option>
                    <option value="Immunology">Immunology</option>
                    <option value="Hormones">Hormones</option>
                    <option value="Clinical Pathology">Clinical Pathology</option>
                    <option value="Imaging/Diagnostic">Imaging/Diagnostic</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-700">Price (Rs.) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={testForm.price}
                    onChange={(e) => setTestForm({ ...testForm, price: parseFloat(e.target.value) || 0 })}
                    className="input-field mt-1"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700">Sample Type</label>
                  <input
                    type="text"
                    value={testForm.sample_type}
                    onChange={(e) => setTestForm({ ...testForm, sample_type: e.target.value })}
                    placeholder="Blood, Urine..."
                    className="input-field mt-1"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700">Turnaround (Hrs)</label>
                  <input
                    type="number"
                    min="1"
                    value={testForm.turnaround_hours}
                    onChange={(e) => setTestForm({ ...testForm, turnaround_hours: parseInt(e.target.value) || 24 })}
                    placeholder="24"
                    className="input-field mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-700">Normal Range</label>
                  <input
                    type="text"
                    value={testForm.normal_range}
                    onChange={(e) => setTestForm({ ...testForm, normal_range: e.target.value })}
                    placeholder="e.g. 13.0 - 17.5"
                    className="input-field mt-1"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700">Measurement Unit</label>
                  <input
                    type="text"
                    value={testForm.unit}
                    onChange={(e) => setTestForm({ ...testForm, unit: e.target.value })}
                    placeholder="e.g. g/dL, mg/dL"
                    className="input-field mt-1"
                  />
                </div>
              </div>

              {/* Home Sample Collection Checkbox */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  id="homeCollectionAvailable"
                  checked={testForm.is_home_collection_available}
                  onChange={(e) => setTestForm({ ...testForm, is_home_collection_available: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="homeCollectionAvailable" className="font-semibold text-slate-800 cursor-pointer">
                  Available for Home Sample Collection (Mobile Phlebotomist)
                </label>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={testForm.description}
                  onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                  placeholder="Clinical significance and parameter details..."
                  className="input-field mt-1 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary flex-1 py-2 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 py-2 text-xs font-bold">
                  {editingTest ? "Update Test" : "Save Test"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
