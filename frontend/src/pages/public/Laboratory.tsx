import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { laboratoryApi } from "../../lib/apiClient";
import type { LabTest, LabBooking, LabBookingItem } from "../../lib/types";
import {
  Activity,
  Search,
  CheckCircle,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  ArrowRight,
  Phone,
  MapPin,
  ShieldCheck,
} from "../../components/icons/Icons";

export default function Laboratory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as "tests" | "book" | "track") || "tests";

  const [activeTab, setActiveTab] = useState<"tests" | "book" | "track">(initialTab);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Booking Form State
  const [bookingType, setBookingType] = useState<"in_clinic" | "home_collection">("in_clinic");
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("unspecified");
  const [collectionAddress, setCollectionAddress] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<{
    tracking_id: string;
    total_amount: number;
    service_type: string;
  } | null>(null);
  const [bookingError, setBookingError] = useState("");

  // Tracking State
  const [trackQuery, setTrackQuery] = useState(searchParams.get("track") || "");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackResult, setTrackResult] = useState<{
    booking: LabBooking;
  } | null>(null);
  const [trackError, setTrackError] = useState("");

  useEffect(() => {
    laboratoryApi
      .tests()
      .then((data: LabTest[]) => {
        setTests(data);
        setLoadingTests(false);
      })
      .catch((err: any) => {
        console.error("Failed to load lab tests:", err);
        setLoadingTests(false);
      });
  }, []);

  useEffect(() => {
    const trackParam = searchParams.get("track");
    if (trackParam) {
      setActiveTab("track");
      setTrackQuery(trackParam);
      handleTrack(trackParam);
    }
  }, [searchParams]);

  const categories = [
    "all",
    ...Array.from(new Set(tests.map((t) => t.category).filter(Boolean))),
  ];

  const filteredTests = tests.filter((t) => {
    const matchesCat = selectedCategory === "all" || t.category === selectedCategory;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.test_code && t.test_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const selectedTests = tests.filter((t) => selectedTestIds.includes(t.id));
  const totalEstimatedCost = selectedTests.reduce((acc, t) => acc + (Number(t.price) || 0), 0);

  const toggleTestSelection = (id: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleStartBookingWithTest = (testId: string) => {
    if (!selectedTestIds.includes(testId)) {
      setSelectedTestIds([...selectedTestIds, testId]);
    }
    setActiveTab("book");
    window.scrollTo({ top: 400, behavior: "smooth" });
  };

  const handleBookingSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBookingError("");

    if (selectedTestIds.length === 0) {
      setBookingError("Please select at least one laboratory test.");
      return;
    }

    if (bookingType === "home_collection") {
      if (!collectionAddress.trim()) {
        setBookingError("Please provide your complete home address for sample collection.");
        return;
      }
      const selectedObjs = tests.filter((t) => selectedTestIds.includes(t.id));
      const unsupported = selectedObjs.filter((t) => !t.is_home_collection_available);
      if (unsupported.length > 0) {
        setBookingError(
          `Home sample collection is not supported for: ${unsupported.map((t) => t.name).join(", ")}. These tests must be performed in-clinic.`
        );
        return;
      }
    }

    setBookingLoading(true);
    try {
      const res = await laboratoryApi.book({
        patient_name: patientName,
        patient_phone: patientPhone,
        patient_email: patientEmail || undefined,
        patient_age: patientAge ? parseInt(patientAge, 10) : undefined,
        patient_gender: patientGender,
        test_ids: selectedTestIds,
        service_type: bookingType === "home_collection" ? "home_service" : "in_clinic",
        home_address: bookingType === "home_collection" ? collectionAddress : undefined,
        booking_date: scheduledDate || new Date().toISOString().split("T")[0],
        notes: notes || undefined,
      });

      setBookingSuccess({
        tracking_id: res.booking.tracking_id,
        total_amount: res.booking.total_amount,
        service_type: res.booking.service_type,
      });
      // Reset form fields
      setSelectedTestIds([]);
      setPatientName("");
      setPatientPhone("");
      setPatientEmail("");
      setPatientAge("");
      setCollectionAddress("");
      setNotes("");
    } catch (err: any) {
      setBookingError(err.message || "Failed to submit booking. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleTrack = async (trackingCodeToUse?: string) => {
    const code = (trackingCodeToUse || trackQuery).trim().toUpperCase();
    if (!code) {
      setTrackError("Please enter your lab tracking ID.");
      return;
    }

    setTrackLoading(true);
    setTrackError("");
    setTrackResult(null);

    try {
      const res = await laboratoryApi.track(code);
      setTrackResult(res);
    } catch (err: any) {
      setTrackError(
        err.message || "No laboratory record found for this tracking ID. Please verify the code."
      );
    } finally {
      setTrackLoading(false);
    }
  };

  const trackingItems: LabBookingItem[] = trackResult?.booking?.items || [];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header Hero */}
      <div className="border-b border-slate-200/80 bg-gradient-to-r from-teal-950 via-slate-900 to-teal-900 py-14 text-white px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-300 mb-4">
            <Activity className="w-3.5 h-3.5" />
            <span>Pathology & Diagnostic Laboratory</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Diagnostic Services & Reports
          </h1>

          <p className="mt-3 max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed">
            ISO-standard clinical diagnostics with automated analyzers, fast turnaround times,
            doorstep home sample collection, and instant online report tracking.
          </p>

          {/* Navigation Tabs */}
          <div className="mt-8 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setActiveTab("tests");
                setSearchParams({ tab: "tests" });
              }}
              className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold transition ${
                activeTab === "tests"
                  ? "bg-teal-600 text-white shadow-md shadow-teal-950/40 ring-1 ring-teal-400"
                  : "bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white"
              }`}
            >
              Browse Lab Tests
            </button>
            <button
              onClick={() => {
                setActiveTab("book");
                setSearchParams({ tab: "book" });
              }}
              className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold transition ${
                activeTab === "book"
                  ? "bg-teal-600 text-white shadow-md shadow-teal-950/40 ring-1 ring-teal-400"
                  : "bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white"
              }`}
            >
              Book Test / Home Collection
            </button>
            <button
              onClick={() => {
                setActiveTab("track");
                setSearchParams({ tab: "track" });
              }}
              className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold transition ${
                activeTab === "track"
                  ? "bg-teal-600 text-white shadow-md shadow-teal-950/40 ring-1 ring-teal-400"
                  : "bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white"
              }`}
            >
              Track Test Results
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-8">
        {/* TAB 1: BROWSE TESTS */}
        {activeTab === "tests" && (
          <div className="space-y-6">
            {/* Search & Filter Bar */}
            <div className="card p-5 flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tests by name or code..."
                  className="input-field pl-9"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? "bg-teal-900 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat === "all" ? "All Categories" : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Tests Grid */}
            {loadingTests ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-48 rounded-2xl bg-white border border-slate-200 animate-pulse p-6"></div>
                ))}
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="card p-12 text-center">
                <Activity className="mx-auto w-12 h-12 text-slate-300" />
                <h3 className="mt-3 text-base font-bold text-slate-800">No tests found</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Try adjusting your search query or switching categories.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTests.map((test) => (
                  <div
                    key={test.id}
                    className="card flex flex-col justify-between p-6 transition-all duration-200 hover:-translate-y-1 hover:border-teal-300 hover:shadow-card"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="badge-teal text-[11px] uppercase tracking-wider font-semibold">
                          {test.category || "General"}
                        </span>
                        {test.normal_range && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                            Range: {test.normal_range} {test.unit || ""}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 text-base font-bold text-teal-950">{test.name}</h3>
                      {test.test_code && (
                        <p className="text-xs font-medium text-slate-400">Code: {test.test_code}</p>
                      )}

                      <p className="mt-2 text-xs text-slate-600 line-clamp-2">
                        {test.description || "Standard clinical pathology diagnostic analysis."}
                      </p>

                      <div className="mt-4 space-y-1 text-xs text-slate-500">
                        {test.sample_type && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700">Sample:</span>{" "}
                            {test.sample_type}
                          </div>
                        )}
                        {test.turnaround_hours && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-teal-700" />
                            <span>Turnaround: {test.turnaround_hours} Hours</span>
                          </div>
                        )}
                        <div className="pt-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              test.is_home_collection_available
                                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {test.is_home_collection_available
                              ? "🏠 Home Collection Available"
                              : "🏥 In-Clinic Only"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                          Test Fee
                        </span>
                        <span className="text-base font-bold text-teal-950">
                          Rs. {Number(test.price).toLocaleString()}
                        </span>
                      </div>

                      <button
                        onClick={() => handleStartBookingWithTest(test.id)}
                        className="btn-primary py-2 px-3.5 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <span>Book Test</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BOOK TEST / HOME COLLECTION */}
        {activeTab === "book" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              {bookingSuccess ? (
                <div className="card p-8 text-center space-y-5 border-emerald-300 bg-emerald-50/40">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-emerald-950">
                      Laboratory Request Confirmed!
                    </h2>
                    <p className="mt-1 text-sm text-emerald-800">
                      Your diagnostic booking has been successfully recorded in our laboratory system.
                    </p>
                  </div>

                  {/* Tracking Token Card */}
                  <div className="mx-auto max-w-sm rounded-2xl bg-white p-5 shadow-sm border border-emerald-200">
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                      Your Lab Tracking ID
                    </span>
                    <div className="mt-1 text-2xl font-black tracking-widest text-teal-900 font-mono">
                      {bookingSuccess.tracking_id}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Save this code to track sample collection, processing status, and download results.
                    </p>
                  </div>

                  {/* Physical Payment Note */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-xs text-amber-900">
                    <div className="font-bold flex items-center gap-1.5 text-amber-950">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      Payment Notice: Pay Physically (No Online Payment)
                    </div>
                    <p className="mt-1 text-amber-800">
                      Total Payable:{" "}
                      <span className="font-bold text-amber-950">
                        Rs. {bookingSuccess.total_amount.toLocaleString()}
                      </span>
                      .{" "}
                      {bookingSuccess.service_type === "home_service"
                        ? "Please hand the cash to our certified phlebotomist when they arrive at your home."
                        : "Please pay cash directly at the hospital Laboratory Reception Counter on arrival."}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <button
                      onClick={() => {
                        setTrackQuery(bookingSuccess.tracking_id);
                        setActiveTab("track");
                        setSearchParams({ tab: "track", track: bookingSuccess.tracking_id });
                      }}
                      className="btn-primary py-2.5 px-5 text-xs font-bold"
                    >
                      Track This Booking
                    </button>
                    <button
                      onClick={() => {
                        setBookingSuccess(null);
                        setSelectedTestIds([]);
                      }}
                      className="btn-secondary py-2.5 px-5 text-xs font-bold"
                    >
                      Book Another Test
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-6">
                  {/* Step 1: Mode of Sample Collection */}
                  <div className="card p-6 sm:p-7">
                    <h3 className="text-base font-bold text-teal-950 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-teal-700" />
                      1. Select Collection Method
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Choose whether you'd like to visit our hospital lab or request home collection.
                    </p>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label
                        onClick={() => setBookingType("in_clinic")}
                        className={`cursor-pointer rounded-2xl border p-4 transition flex items-start gap-3 ${
                          bookingType === "in_clinic"
                            ? "border-teal-600 bg-teal-50/60 ring-2 ring-teal-600/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="bookingType"
                          checked={bookingType === "in_clinic"}
                          onChange={() => setBookingType("in_clinic")}
                          className="mt-1 text-teal-600"
                        />
                        <div>
                          <div className="font-bold text-sm text-teal-950">In-Clinic Sample</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Visit Hospital Central Lab. Walk-ins & scheduled slots with minimal wait times.
                          </div>
                        </div>
                      </label>

                      <label
                        onClick={() => setBookingType("home_collection")}
                        className={`cursor-pointer rounded-2xl border p-4 transition flex items-start gap-3 ${
                          bookingType === "home_collection"
                            ? "border-teal-600 bg-teal-50/60 ring-2 ring-teal-600/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="bookingType"
                          checked={bookingType === "home_collection"}
                          onChange={() => setBookingType("home_collection")}
                          className="mt-1 text-teal-600"
                        />
                        <div>
                          <div className="font-bold text-sm text-teal-950">Home Sample Collection</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            A certified phlebotomist visits your home. Sterile kit and temperature-controlled transit.
                          </div>
                        </div>
                      </label>
                    </div>

                    {bookingType === "home_collection" && (
                      <div className="mt-4">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Complete Home / Collection Address <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative mt-1.5">
                          <MapPin className="absolute top-3 left-3 w-4 h-4 text-slate-400" />
                          <textarea
                            rows={2}
                            required={bookingType === "home_collection"}
                            value={collectionAddress}
                            onChange={(e) => setCollectionAddress(e.target.value)}
                            placeholder="House / Apartment #, Street, Sector / Area, Landmark, City..."
                            className="input-field pl-9 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Select Tests */}
                  <div className="card p-6 sm:p-7">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-teal-950 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-teal-700" />
                          2. Select Tests ({selectedTestIds.length} Selected)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Check all diagnostic tests or health packages required.
                        </p>
                      </div>
                      {selectedTestIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedTestIds([])}
                          className="text-xs text-rose-600 font-semibold hover:underline"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    <div className="mt-4 max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                      {tests.map((test) => {
                        const isChecked = selectedTestIds.includes(test.id);
                        return (
                          <label
                            key={test.id}
                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${
                              isChecked ? "bg-teal-50/70 border border-teal-200" : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleTestSelection(test.id)}
                                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                              />
                              <div>
                                <div className="text-xs font-bold text-teal-950">
                                  {test.name}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {test.category} {test.sample_type ? `• Sample: ${test.sample_type}` : ""}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-teal-950">
                                Rs. {Number(test.price).toLocaleString()}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 3: Patient Information */}
                  <div className="card p-6 sm:p-7 space-y-4">
                    <h3 className="text-base font-bold text-teal-950">3. Patient Contact & Schedule</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Patient Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          placeholder="e.g. Asad Ullah Khan"
                          className="input-field mt-1.5"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Age (Years)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={patientAge}
                          onChange={(e) => setPatientAge(e.target.value)}
                          placeholder="e.g. 35"
                          className="input-field mt-1.5"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Gender
                        </label>
                        <select
                          value={patientGender}
                          onChange={(e) => setPatientGender(e.target.value)}
                          className="input-field mt-1.5"
                        >
                          <option value="unspecified">Unspecified</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Mobile Phone <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={patientPhone}
                          onChange={(e) => setPatientPhone(e.target.value)}
                          placeholder="0300-1234567"
                          className="input-field mt-1.5"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Preferred Date <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={scheduledDate}
                          min={new Date().toISOString().split("T")[0]}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="input-field mt-1.5"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Email Address (For Report Delivery)
                      </label>
                      <input
                        type="email"
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder="patient@example.com"
                        className="input-field mt-1.5"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Special Instructions / Doctor Referral Notes
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Doctor Dr. Tariq advised fasting profile..."
                        className="input-field mt-1.5 text-xs"
                      />
                    </div>
                  </div>

                  {bookingError && (
                    <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-4 text-xs text-rose-800 ring-1 ring-rose-200">
                      <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5" />
                      <span>{bookingError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={bookingLoading || selectedTestIds.length === 0}
                    className="btn-primary w-full py-3.5 text-sm font-bold shadow-lg shadow-teal-950/20 disabled:opacity-50"
                  >
                    {bookingLoading ? "Registering Laboratory Booking..." : "Confirm Diagnostic Booking"}
                  </button>
                </form>
              )}
            </div>

            {/* Live Fee & Policy Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <div className="card p-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Diagnostic Order Summary
                </h4>

                <div className="mt-4 space-y-3 divide-y divide-slate-100 text-xs">
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-500">Collection Mode</span>
                    <span className="font-semibold text-teal-950 capitalize">
                      {bookingType === "home_collection" ? "Home Sample Collection" : "In-Clinic Lab"}
                    </span>
                  </div>

                  <div className="pt-3">
                    <span className="text-slate-500 block mb-1">Selected Tests ({selectedTests.length})</span>
                    {selectedTests.length === 0 ? (
                      <span className="italic text-slate-400">No tests selected yet</span>
                    ) : (
                      <ul className="space-y-1">
                        {selectedTests.map((t) => (
                          <li key={t.id} className="flex justify-between font-medium text-slate-700">
                            <span className="truncate pr-2">{t.name}</span>
                            <span className="font-bold text-teal-950">Rs. {Number(t.price).toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="pt-3 flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-900">Total Fee</span>
                    <span className="font-extrabold text-teal-950 text-base">
                      Rs. {totalEstimatedCost.toLocaleString()}
                    </span>
                  </div>

                  <div className="pt-3 rounded-xl bg-emerald-50 p-3 text-emerald-900 border border-emerald-200/60">
                    <div className="font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      Payment: Pay Physically
                    </div>
                    <p className="mt-0.5 text-[11px] text-emerald-800 leading-tight">
                      No online transaction required. Cash is collected at the lab counter or upon sample collection at your doorstep.
                    </p>
                  </div>
                </div>
              </div>

              {/* Lab Quality Assurance */}
              <div className="card p-6 text-xs text-slate-600 space-y-3">
                <h4 className="font-bold text-teal-950 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  Quality Diagnostic Protocols
                </h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
                    <span>Double-verified barcode tagging eliminates sample mix-ups.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
                    <span>Supervised by senior consultant pathologists.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
                    <span>Instant report verification via official QR / Tracking ID.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TRACK TEST RESULTS */}
        {activeTab === "track" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="card p-6 sm:p-8">
              <h3 className="text-xl font-bold text-teal-950">Track Diagnostic Report</h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter your unique Laboratory Tracking ID (e.g. LAB-104928) provided on your token slip.
              </p>

              <div className="mt-5 flex gap-2">
                <input
                  type="text"
                  value={trackQuery}
                  onChange={(e) => setTrackQuery(e.target.value)}
                  placeholder="Enter Tracking ID (e.g. LAB-123456)"
                  className="input-field font-mono uppercase text-sm tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => handleTrack()}
                  disabled={trackLoading}
                  className="btn-primary py-2.5 px-6 text-xs font-bold shrink-0"
                >
                  {trackLoading ? "Searching..." : "Track Report"}
                </button>
              </div>

              {trackError && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 p-4 text-xs text-rose-800 border border-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  <span>{trackError}</span>
                </div>
              )}
            </div>

            {/* Results Display Card */}
            {trackResult && (
              <div className="card p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 gap-3">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                      {trackResult.booking.tracking_id}
                    </span>
                    <h3 className="text-xl font-bold text-teal-950 mt-2">
                      {trackResult.booking.patient_name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Booking Date: {new Date(trackResult.booking.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span
                      className={`inline-block px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                        trackResult.booking.status === "completed"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : trackResult.booking.status === "in_progress"
                          ? "bg-blue-100 text-blue-800 border border-blue-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      Status: {trackResult.booking.status.replace("_", " ")}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      Collection: {trackResult.booking.service_type === "home_service" ? "Home Visit" : "In-Clinic"}
                    </p>
                  </div>
                </div>

                {/* Test Items & Diagnostic Findings */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Diagnostic Parameters & Findings ({trackingItems.length})
                  </h4>

                  <div className="space-y-3">
                    {trackingItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="text-sm font-bold text-teal-950">{item.test_name}</h5>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              item.result_status === "completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.result_status === "in_progress"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {item.result_status.toUpperCase()}
                          </span>
                        </div>

                        {item.result_status === "completed" ? (
                          <div className="mt-2 rounded-xl bg-white p-3 border border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                                Measured Value
                              </span>
                              <span className="text-base font-black text-teal-950">
                                {item.result_value || "Normal / Negative"}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                                Reference Range
                              </span>
                              <span className="text-slate-700 font-medium">
                                {item.normal_range || "N/A"} {item.unit || ""}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                                Verified Date
                              </span>
                              <span className="text-slate-700 font-medium">
                                {item.completed_at ? new Date(item.completed_at).toLocaleString() : "Verified"}
                              </span>
                            </div>

                            {item.remarks && (
                              <div className="sm:col-span-3 pt-2 border-t border-slate-100 text-slate-600">
                                <span className="font-semibold text-slate-800">Remarks:</span>{" "}
                                {item.remarks}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
                            Sample received in laboratory. Diagnostic analysis in progress. Results will be posted as soon as verified by the pathologist.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {trackResult.booking.status === "completed" && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => window.print()}
                      className="btn-outline text-xs py-2 px-4"
                    >
                      Print Official Diagnostic Report
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
