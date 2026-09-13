import { useEffect, useState, useMemo } from "react";
import { laboratoryApi } from "../../lib/apiClient";
import type { LabTest, LabBooking } from "../../lib/types";
import {
  FileText,
  Search,
  Plus,
  CheckCircle,
  AlertCircle,
  X,
  Phone,
  Clock,
  Activity,
  ShieldCheck,
  Building,
} from "../../components/icons/Icons";

export default function ReceptionLaboratory() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Booking Modal
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("Male");
  const [serviceType, setServiceType] = useState<"in_clinic" | "home_service">("in_clinic");
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bookingTime, setBookingTime] = useState("09:00");
  const [homeAddress, setHomeAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<{
    code: string;
    trackingId: string;
    patient: string;
  } | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Tracking Modal
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [trackedBooking, setTrackedBooking] = useState<LabBooking | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  async function loadTests() {
    setLoading(true);
    setError(null);
    try {
      const data = await laboratoryApi.tests();
      setTests(data);
    } catch (err: any) {
      console.error("Failed to load laboratory tests:", err);
      setError(err.message || "Failed to load diagnostic tests catalog.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTests();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    tests.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort();
  }, [tests]);

  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      const matchesSearch =
        !searchQuery.trim() ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.test_code && t.test_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.sample_type && t.sample_type.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategory === "all" ||
        (t.category && t.category.toLowerCase() === selectedCategory.toLowerCase());

      return matchesSearch && matchesCat;
    });
  }, [tests, searchQuery, selectedCategory]);

  const homeCollectionCount = useMemo(
    () => tests.filter((t) => t.is_home_collection_available).length,
    [tests]
  );

  function openBookModalForTest(test: LabTest) {
    setSelectedTestIds([test.id]);
    setBookingError(null);
    setBookingSuccess(null);
    setBookModalOpen(true);
  }

  async function handleBookSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientName.trim() || !patientPhone.trim()) {
      setBookingError("Patient full name and phone number are required.");
      return;
    }
    if (selectedTestIds.length === 0) {
      setBookingError("Please select at least one laboratory test.");
      return;
    }
    if (serviceType === "home_service" && !homeAddress.trim()) {
      setBookingError("Home address is required for Home Sample Collection.");
      return;
    }

    setSubmittingBooking(true);
    setBookingError(null);
    try {
      const res = await laboratoryApi.book({
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim(),
        patient_email: patientEmail.trim() || undefined,
        patient_age: patientAge ? Number(patientAge) : undefined,
        patient_gender: patientGender,
        service_type: serviceType,
        booking_date: bookingDate,
        booking_time: bookingTime,
        home_address: serviceType === "home_service" ? homeAddress.trim() : undefined,
        notes: notes.trim() || undefined,
        test_ids: selectedTestIds,
      });

      setBookingSuccess({
        code: res.booking.booking_code,
        trackingId: res.booking.tracking_id,
        patient: res.booking.patient_name,
      });

      // Clear fields
      setPatientName("");
      setPatientPhone("");
      setPatientEmail("");
      setPatientAge("");
      setHomeAddress("");
      setNotes("");
    } catch (err: any) {
      console.error("Failed to book lab test:", err);
      setBookingError(err.message || "Failed to book laboratory test.");
    } finally {
      setSubmittingBooking(false);
    }
  }

  async function handleTrackSearch(e: React.FormEvent) {
    e.preventDefault();
    const clean = trackingInput.trim();
    if (!clean) return;

    setTrackingLoading(true);
    setTrackingError(null);
    setTrackedBooking(null);
    try {
      const res = await laboratoryApi.track(clean);
      setTrackedBooking(res.booking);
    } catch (err: any) {
      setTrackingError(err.message || "No laboratory booking found for this tracking ID.");
    } finally {
      setTrackingLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
            Hospital Pathology & Diagnostic Counter
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Front Desk Laboratory Services
          </h1>
          <p className="text-xs text-slate-500">
            Browse complete laboratory test catalog, schedule diagnostic investigations, and issue tracking slips.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setSelectedTestIds(tests.length > 0 ? [tests[0].id] : []);
              setBookingSuccess(null);
              setBookingError(null);
              setBookModalOpen(true);
            }}
            className="btn-primary inline-flex items-center gap-2 text-xs shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Book Lab Test</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTrackedBooking(null);
              setTrackingError(null);
              setTrackingInput("");
              setTrackModalOpen(true);
            }}
            className="btn-outline inline-flex items-center gap-2 text-xs"
          >
            <Search className="h-4 w-4" />
            <span>Track Lab Slip</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Catalog Tests</span>
          <div className="mt-2 text-2xl font-extrabold text-teal-950">{tests.length}</div>
          <div className="mt-1 text-[11px] text-teal-700 font-semibold">Active investigations</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Home Collection</span>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600">{homeCollectionCount}</div>
          <div className="mt-1 text-[11px] text-emerald-700 font-semibold">Available for doorstep dispatch</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Categories</span>
          <div className="mt-2 text-2xl font-extrabold text-blue-900">{categories.length}</div>
          <div className="mt-1 text-[11px] text-blue-700 font-semibold">Pathology disciplines</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Turnaround</span>
          <div className="mt-2 text-2xl font-extrabold text-amber-600">24-48h</div>
          <div className="mt-1 text-[11px] text-amber-700 font-semibold">Routine verification rate</div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search test by name, test code (e.g. CBC, LFT), or specimen..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700 w-full sm:w-48"
          >
            <option value="all">All Disciplines ({tests.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table of Tests */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent mb-2" />
            <p>Loading laboratory diagnostic catalog...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600">
            <AlertCircle className="mx-auto h-8 w-8 text-rose-500 mb-2" />
            <p className="font-bold">{error}</p>
            <button
              onClick={loadTests}
              className="mt-3 rounded-lg bg-rose-50 px-3 py-1.5 font-bold text-rose-700 hover:bg-rose-100"
            >
              Retry Loading
            </button>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No laboratory tests match your search criteria.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="mt-2 text-teal-700 font-bold hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Test Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4">Sample Type</th>
                  <th className="py-3 px-4">Collection Options</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredTests.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{t.name}</div>
                      <div className="text-[10px] text-slate-400">
                        Code: <span className="font-mono text-teal-800">{t.test_code || "LAB"}</span>
                        {t.turnaround_hours && ` • ${t.turnaround_hours}h turnaround`}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                        {t.category || "General"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-teal-950">
                      Rs. {Number(t.price).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {t.sample_type || "Specimen required"}
                    </td>
                    <td className="py-3.5 px-4">
                      {t.is_home_collection_available ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-200">
                          <CheckCircle className="h-3 w-3 text-emerald-600" />
                          In-Clinic & Home
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          In-Clinic Only
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800 ring-1 ring-teal-200 uppercase">
                        Active
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openBookModalForTest(t)}
                        className="rounded-lg border border-teal-700 bg-teal-800 px-3 py-1 text-[11px] font-bold text-white hover:bg-teal-900 transition shadow-xs"
                      >
                        Book Test
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================
          MODAL 1: BOOK LABORATORY TEST
      ============================================================ */}
      {bookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-800 text-white">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-teal-950">Book Laboratory Test</h3>
                  <p className="text-[11px] text-slate-500">
                    Front desk patient intake with instant confirmation & email tracking slip.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBookModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {bookingSuccess && (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-xs text-emerald-900 ring-1 ring-emerald-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  Laboratory Test Booked & Confirmed!
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Patient Name:</span>
                    <span className="font-bold text-slate-900">{bookingSuccess.patient}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Booking Reference:</span>
                    <span className="font-mono font-bold text-teal-800">{bookingSuccess.code}</span>
                  </div>
                  <div className="col-span-2 rounded-xl bg-white p-2.5 border border-emerald-200">
                    <span className="text-slate-500 block">Tracking ID (provided to patient):</span>
                    <span className="font-mono text-sm font-extrabold text-teal-900">{bookingSuccess.trackingId}</span>
                  </div>
                </div>
                <p className="text-[11px] text-emerald-700">
                  Confirmation and laboratory tracking slip dispatched to patient&apos;s email address.
                </p>
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setBookingSuccess(null);
                      setBookModalOpen(false);
                    }}
                    className="rounded-xl bg-emerald-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-900"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {bookingError && (
              <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 ring-1 ring-rose-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{bookingError}</span>
              </div>
            )}

            {!bookingSuccess && (
              <form onSubmit={handleBookSubmit} className="mt-4 space-y-3.5 text-xs">
                {/* Patient Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700">Patient Full Name *</label>
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g. Faraz Ali"
                      className="input-field mt-1"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700">Patient Phone *</label>
                    <input
                      type="text"
                      required
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="03001234567"
                      className="input-field mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block font-bold text-slate-700">Age</label>
                    <input
                      type="number"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      placeholder="e.g. 28"
                      className="input-field mt-1"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block font-bold text-slate-700">Gender</label>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      className="input-field mt-1"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block font-bold text-slate-700">Patient Email</label>
                    <input
                      type="email"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      placeholder="patient@example.com"
                      className="input-field mt-1"
                    />
                  </div>
                </div>

                {/* Test Selection */}
                <div>
                  <label className="block font-bold text-slate-700">Select Diagnostic Test(s) *</label>
                  <select
                    multiple
                    value={selectedTestIds}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, (option) => option.value);
                      setSelectedTestIds(values);
                    }}
                    className="input-field mt-1 min-h-24"
                  >
                    {tests.map((test) => (
                      <option key={test.id} value={test.id}>
                        {test.name} ({test.category}) — Rs. {Number(test.price).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-500">Hold Ctrl (or Cmd) to select multiple tests.</p>
                </div>

                {/* Collection Option */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Collection Mode *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setServiceType("in_clinic")}
                      className={`rounded-xl border p-2.5 text-left transition font-semibold ${
                        serviceType === "in_clinic"
                          ? "border-teal-700 bg-teal-50/70 text-teal-950 ring-1 ring-teal-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <Building className="h-3.5 w-3.5 text-teal-700" />
                        In-Clinic Laboratory
                      </div>
                      <span className="block text-[10px] text-slate-500 mt-0.5">Sample drawn at hospital counter</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setServiceType("home_service")}
                      className={`rounded-xl border p-2.5 text-left transition font-semibold ${
                        serviceType === "home_service"
                          ? "border-emerald-700 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <Clock className="h-3.5 w-3.5 text-emerald-700" />
                        Home Sample Collection
                      </div>
                      <span className="block text-[10px] text-slate-500 mt-0.5">Phlebotomist dispatched to home</span>
                    </button>
                  </div>
                </div>

                {/* Address if Home Collection */}
                {serviceType === "home_service" && (
                  <div>
                    <label className="block font-bold text-slate-700">Home Collection Address *</label>
                    <textarea
                      required
                      value={homeAddress}
                      onChange={(e) => setHomeAddress(e.target.value)}
                      placeholder="Complete residential address, street, landmark, and house number..."
                      className="input-field mt-1 h-16"
                    />
                  </div>
                )}

                {/* Booking Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700">Booking Date *</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().slice(0, 10)}
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="input-field mt-1"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700">Preferred Time Slot</label>
                    <input
                      type="time"
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="input-field mt-1"
                    />
                  </div>
                </div>

                {/* Special Instructions */}
                <div>
                  <label className="block font-bold text-slate-700">Clinical Notes / Fasting Requirements</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. 12-hour fasting required, diabetic screening"
                    className="input-field mt-1"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setBookModalOpen(false)}
                    className="btn-secondary py-2 px-4 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingBooking}
                    className="btn-primary py-2 px-5 text-xs font-bold"
                  >
                    {submittingBooking ? "Confirming Booking..." : "Confirm Laboratory Booking"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 2: TRACK LABORATORY SLIP
      ============================================================ */}
      {trackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-800 text-white">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-teal-950">Track Laboratory Investigation</h3>
                  <p className="text-[11px] text-slate-500">
                    Lookup specimen progress and verification status using Tracking ID.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrackModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTrackSearch} className="mt-4 flex gap-2">
              <input
                type="text"
                required
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                placeholder="Enter Tracking ID (e.g. LAB-2026-123456)..."
                className="input-field py-2 text-xs flex-1"
              />
              <button
                type="submit"
                disabled={trackingLoading}
                className="btn-primary py-2 px-4 text-xs font-bold shrink-0"
              >
                {trackingLoading ? "Searching..." : "Track"}
              </button>
            </form>

            {trackingError && (
              <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 ring-1 ring-rose-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{trackingError}</span>
              </div>
            )}

            {trackedBooking && (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{trackedBooking.patient_name}</span>
                    <span className="block text-[11px] text-slate-500">Phone: {trackedBooking.patient_phone}</span>
                  </div>
                  <span className="rounded-full bg-teal-100 px-2.5 py-0.5 font-extrabold text-teal-900 text-[10px] uppercase">
                    {trackedBooking.status.replace("_", " ")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block font-semibold">Tracking ID:</span>
                    <span className="font-mono font-bold text-teal-800">{trackedBooking.tracking_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Service Mode:</span>
                    <span className="font-bold text-slate-800 capitalize">
                      {trackedBooking.service_type === "home_service" ? "Home Collection" : "In-Clinic Lab"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Booking Date:</span>
                    <span className="font-bold text-slate-800">
                      {String(trackedBooking.booking_date).slice(0, 10)} {trackedBooking.booking_time || ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Total Amount:</span>
                    <span className="font-bold text-teal-950">Rs. {Number(trackedBooking.total_amount).toLocaleString()}</span>
                  </div>
                </div>

                {trackedBooking.items && trackedBooking.items.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">Investigation Items:</span>
                    <div className="space-y-1.5">
                      {trackedBooking.items.map((it: any) => (
                        <div key={it.id || it.test_name} className="flex items-center justify-between rounded-lg bg-white p-2 border border-slate-200">
                          <div>
                            <span className="font-semibold text-slate-800">{it.test_name}</span>
                            {it.result_value && (
                              <span className="block text-[11px] text-teal-800 font-bold">
                                Result: {it.result_value} {it.unit || ""} (Ref: {it.normal_range || "N/A"})
                              </span>
                            )}
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700 uppercase">
                            {it.result_status || "pending"}
                          </span>
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
