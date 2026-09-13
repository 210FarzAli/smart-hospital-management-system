import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { laboratoryApi } from "../../lib/apiClient";
import type { LabBooking } from "../../lib/types";
import {
  Activity,
  Calendar,
  Clock,
  CheckCircle,
  ShieldCheck,
  ArrowRight,
  MapPin,
  FileText,
} from "../../components/icons/Icons";

export default function LaboratoryDashboard() {
  const [bookings, setBookings] = useState<LabBooking[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await laboratoryApi.adminBookings();
      setBookings(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const normStatus = (s: string) =>
    s === "booked" || s === "sample_collection_pending" ? "pending" : s === "processing" ? "in_progress" : s;

  const pendingCount = bookings.filter((b) => normStatus(b.status) === "pending").length;
  const sampleCollectedCount = bookings.filter((b) => normStatus(b.status) === "sample_collected").length;
  const inProgressCount = bookings.filter((b) => normStatus(b.status) === "in_progress").length;
  const completedCount = bookings.filter((b) => normStatus(b.status) === "completed").length;

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await laboratoryApi.updateStatus(id, status);
      load();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Pathology Laboratory Operations
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Laboratory Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Live sample intake tracking, diagnostic analysis status, and pathology reporting.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/lab/bookings"
            className="btn-outline inline-flex items-center gap-2 text-xs"
          >
            <Calendar className="h-3.5 w-3.5" />
            Manage All Samples
          </Link>
          <Link
            to="/lab/results"
            className="btn-primary inline-flex items-center gap-2 text-xs shadow-sm"
          >
            <FileText className="h-3.5 w-3.5" />
            Enter Results
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Pending Intake</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-teal-950">{pendingCount}</div>
          <div className="mt-1 text-xs text-slate-400">Awaiting sample arrival / dispatch</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase">Samples Collected</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-blue-900">{sampleCollectedCount}</div>
          <div className="mt-1 text-xs text-slate-400">Ready for automated analyzer</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase">In Processing</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-800">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-indigo-950">{inProgressCount}</div>
          <div className="mt-1 text-xs text-slate-400">Diagnostic run in progress</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase">Released Reports</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-emerald-700">{completedCount}</div>
          <div className="mt-1 text-xs text-slate-400">Completed & verified reports</div>
        </div>
      </div>

      {/* Recent Orders Queue */}
      <div className="card p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-teal-950">Active Diagnostic Requests Queue</h2>
            <p className="text-xs text-slate-500">
              Recent in-clinic and home collection sample tickets
            </p>
          </div>
          <Link to="/lab/bookings" className="text-xs font-semibold text-teal-800 hover:underline">
            View All ({bookings.length}) →
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Tracking ID</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Collection Mode</th>
                <th className="px-4 py-3">Bill Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Intake Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    Loading queue...
                  </td>
                </tr>
              ) : bookings.slice(0, 7).map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-mono font-bold text-teal-950">
                    <span className="bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {b.tracking_id}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-slate-900">{b.patient_name}</div>
                    <div className="text-[11px] text-slate-500">{b.patient_phone}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    {b.service_type === "home_service" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800 ring-1 ring-blue-200">
                        <MapPin className="h-3 w-3" />
                        Home Service
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800 ring-1 ring-teal-200">
                        In-Clinic
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-teal-950">
                    Rs. {Number(b.total_amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        b.status === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : b.status === "in_progress"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {b.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {b.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(b.id, "sample_collected")}
                        className="rounded-lg bg-teal-800 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-teal-700 transition"
                      >
                        Sample Received
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
                      <Link
                        to="/lab/results"
                        className="inline-block rounded-lg border border-teal-600 bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-900 hover:bg-teal-100 transition"
                      >
                        Enter Results →
                      </Link>
                    )}
                    {b.status === "completed" && (
                      <span className="text-[11px] font-semibold text-emerald-700">Released</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
