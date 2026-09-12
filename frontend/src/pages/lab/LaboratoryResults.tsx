import { useEffect, useState } from "react";
import { laboratoryApi } from "../../lib/apiClient";
import type { LabBooking } from "../../lib/types";
import {
  FileText,
  Search,
  CheckCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
} from "../../components/icons/Icons";

export default function LaboratoryResults() {
  const [trackingId, setTrackingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeBooking, setActiveBooking] = useState<LabBooking | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Result entry form values for each item
  const [itemForms, setItemForms] = useState<{
    [itemId: string]: {
      result_value: string;
      reference_range: string;
      units: string;
      remarks: string;
      saving: boolean;
    };
  }>({});

  // Recent in-processing list for quick selection
  const [pendingBookings, setPendingBookings] = useState<LabBooking[]>([]);

  useEffect(() => {
    laboratoryApi
      .adminBookings()
      .then((data) => {
        setPendingBookings(
          data.filter(
            (b) =>
              b.status === "in_progress" ||
              b.status === "sample_collected" ||
              b.status === "confirmed"
          )
        );
      })
      .catch(console.error);
  }, []);

  const handleLookup = async (codeToLookup?: string) => {
    const code = (codeToLookup || trackingId).trim().toUpperCase();
    if (!code) {
      setError("Please enter a tracking ID.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setActiveBooking(null);

    try {
      const data = await laboratoryApi.track(code);
      setActiveBooking(data.booking);

      // Initialize form fields for each item
      const forms: typeof itemForms = {};
      (data.booking.items || []).forEach((item) => {
        forms[item.id] = {
          result_value: item.result_value || "",
          reference_range: item.normal_range || "",
          units: item.unit || "",
          remarks: item.remarks || "",
          saving: false,
        };
      });
      setItemForms(forms);
    } catch (err: any) {
      setError(err.message || "Failed to find booking for this tracking ID.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResult = async (itemId: string) => {
    if (!activeBooking) return;
    const form = itemForms[itemId];
    if (!form || !form.result_value.trim()) {
      alert("Please enter a measured result value.");
      return;
    }

    setItemForms((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], saving: true },
    }));

    try {
      await laboratoryApi.recordResults(activeBooking.id, [
        {
          itemId,
          resultValue: form.result_value,
          normalRange: form.reference_range,
          unit: form.units,
          remarks: form.remarks,
          status: "completed",
        },
      ]);

      setSuccess("Diagnostic result saved and report released successfully!");
      handleLookup(activeBooking.tracking_id);
    } catch (err: any) {
      alert(err.message || "Failed to record result.");
      setItemForms((prev) => ({
        ...prev,
        [itemId]: { ...prev[itemId], saving: false },
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          Clinical Laboratory Results Entry
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
          Pathology Diagnostic Results
        </h1>
        <p className="text-xs text-slate-500">
          Enter biochemical, hematological, and microbiological test parameters to verify and release reports.
        </p>
      </div>

      {/* Lookup Bar */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-teal-950 mb-1">Search Booking by Tracking ID</h2>
        <p className="text-xs text-slate-500 mb-4">
          Enter the patient's lab tracking code (e.g. LAB-104928) or choose from the processing queue below.
        </p>

        <div className="flex gap-2 max-w-lg">
          <input
            type="text"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            placeholder="e.g. LAB-123456"
            className="input-field font-mono uppercase text-xs"
          />
          <button
            type="button"
            onClick={() => handleLookup()}
            disabled={loading}
            className="btn-primary py-2 px-5 text-xs font-bold shrink-0"
          >
            {loading ? "Searching..." : "Lookup Ticket"}
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Quick select pills from active queue */}
        {pendingBookings.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <span className="text-[11px] uppercase font-bold text-slate-400 block mb-2">
              Recent Intake Queue:
            </span>
            <div className="flex flex-wrap gap-2">
              {pendingBookings.slice(0, 8).map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setTrackingId(b.tracking_id);
                    handleLookup(b.tracking_id);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-mono font-semibold text-slate-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-950 transition"
                >
                  {b.tracking_id} ({b.patient_name})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Booking Entry Form */}
      {activeBooking && (
        <div className="space-y-6">
          {/* Patient Details Header Card */}
          <div className="card p-6 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-teal-900 bg-teal-100 px-2 py-0.5 rounded border border-teal-300">
                  {activeBooking.tracking_id}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    activeBooking.status === "completed"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {activeBooking.status.replace("_", " ")}
                </span>
              </div>
              <h2 className="text-lg font-bold text-teal-950 mt-1.5">
                {activeBooking.patient_name}
              </h2>
              <div className="text-xs text-slate-500">
                Phone: {activeBooking.patient_phone} • Age: {activeBooking.patient_age || "N/A"} yrs • Gender: {activeBooking.patient_gender || "unspecified"}
              </div>
            </div>

            <div className="text-left sm:text-right text-xs">
              <span className="text-slate-400 block font-medium uppercase text-[10px]">Collection Method</span>
              <span className="font-bold text-teal-950 capitalize">
                {activeBooking.service_type === "home_service" ? "Home Service" : "In-Clinic Laboratory"}
              </span>
              {activeBooking.home_address && (
                <div className="text-[11px] text-slate-500 mt-1">
                  Address: {activeBooking.home_address}
                </div>
              )}
              {activeBooking.notes && (
                <div className="text-[11px] text-slate-500 mt-1 italic">
                  Note: {activeBooking.notes}
                </div>
              )}
            </div>
          </div>

          {/* Test Items and Findings Form */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Diagnostic Test Items ({(activeBooking.items || []).length})
            </h3>

            {(activeBooking.items || []).map((item) => {
              const form = itemForms[item.id] || {
                result_value: "",
                reference_range: "",
                units: "",
                remarks: "",
                saving: false,
              };

              return (
                <div key={item.id} className="card p-6 space-y-4">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-base font-bold text-teal-950">{item.test_name}</h4>
                      <span className="text-xs text-slate-400">Fee: Rs. {Number(item.price).toLocaleString()}</span>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        item.result_status === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.result_status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block font-bold uppercase text-slate-700">
                        Measured Result Value *
                      </label>
                      <input
                        type="text"
                        value={form.result_value}
                        onChange={(e) =>
                          setItemForms((prev) => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], result_value: e.target.value },
                          }))
                        }
                        placeholder="e.g. 14.5 or Negative"
                        className="input-field mt-1 font-semibold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold uppercase text-slate-700">
                        Reference Range / Normal
                      </label>
                      <input
                        type="text"
                        value={form.reference_range}
                        onChange={(e) =>
                          setItemForms((prev) => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], reference_range: e.target.value },
                          }))
                        }
                        placeholder="e.g. 13.0 - 17.5"
                        className="input-field mt-1"
                      />
                    </div>

                    <div>
                      <label className="block font-bold uppercase text-slate-700">Unit of Measurement</label>
                      <input
                        type="text"
                        value={form.units}
                        onChange={(e) =>
                          setItemForms((prev) => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], units: e.target.value },
                          }))
                        }
                        placeholder="e.g. g/dL, mg/dL, %"
                        className="input-field mt-1"
                      />
                    </div>
                  </div>

                  <div className="text-xs">
                    <label className="block font-bold uppercase text-slate-700">
                      Pathologist Clinical Remarks & Observations
                    </label>
                    <input
                      type="text"
                      value={form.remarks}
                      onChange={(e) =>
                        setItemForms((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], remarks: e.target.value },
                        }))
                      }
                      placeholder="e.g. Values within normal physiological limits..."
                      className="input-field mt-1"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={form.saving}
                      onClick={() => handleSaveResult(item.id)}
                      className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-1.5"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>{form.saving ? "Saving..." : "Verify & Release Result"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
