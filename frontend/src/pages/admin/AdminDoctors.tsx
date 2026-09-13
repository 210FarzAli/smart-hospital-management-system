import { useEffect, useMemo, useState } from "react";
import { departmentsApi, doctorsApi } from "../../lib/apiClient";
import type { Department, Doctor } from "../../lib/types";
import {
  Stethoscope,
  Search,
  User,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Building,
} from "../../components/icons/Icons";

type DoctorFilter = "all" | "active" | "inactive";

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filter, setFilter] = useState<DoctorFilter>("all");
  const [search, setSearch] = useState("");
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDoctors() {
    try {
      setLoadingDoctors(true);
      setError(null);
      const data = await doctorsApi.adminList();
      setDoctors(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to load doctors list."
      );
    } finally {
      setLoadingDoctors(false);
    }
  }

  useEffect(() => {
    loadDoctors();
    departmentsApi
      .list()
      .then(setDepartments)
      .catch(console.error);
  }, []);

  const filteredDoctors = useMemo(() => {
    let result = [...doctors];

    if (filter === "active") {
      result = result.filter((d) => d.status === "active");
    } else if (filter === "inactive") {
      result = result.filter((d) => d.status === "inactive");
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (d) =>
          d.full_name?.toLowerCase().includes(q) ||
          d.specialization?.toLowerCase().includes(q) ||
          d.department_name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [doctors, filter, search]);

  const activeCount = useMemo(
    () => doctors.filter((d) => d.status === "active").length,
    [doctors]
  );
  const inactiveCount = doctors.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Medical Staff Registry
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Doctors Directory ({doctors.length})
          </h1>
          <p className="text-xs text-slate-500">
            Operational overview of medical specialists, departmental credentials, and active consulting status.
          </p>
        </div>
      </div>

      {/* HR Authority Notice Banner */}
      <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4.5 text-xs text-teal-950 flex items-start gap-3.5 shadow-xs">
        <Building className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-teal-900 text-sm">Human Resources (HR) Authority Model</p>
          <p className="mt-1 text-teal-800 leading-relaxed">
            Doctor employment, hiring, credential verification, scheduling, and profile onboarding are managed exclusively by the <b>Human Resources (HR) Department</b>. Administrators retain operational view access across all active medical consultants.
          </p>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`card flex items-center justify-between p-4 text-left transition-all ${
            filter === "all"
              ? "ring-2 ring-teal-600 bg-teal-50/40"
              : "hover:bg-slate-50/60"
          }`}
        >
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">
              Total Physicians
            </div>
            <div className="mt-1 text-2xl font-extrabold text-teal-950">
              {doctors.length}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100/60 text-teal-800">
            <Stethoscope className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("active")}
          className={`card flex items-center justify-between p-4 text-left transition-all ${
            filter === "active"
              ? "ring-2 ring-emerald-600 bg-emerald-50/40"
              : "hover:bg-slate-50/60"
          }`}
        >
          <div>
            <div className="text-xs font-bold text-emerald-800 uppercase">
              Active / On Duty
            </div>
            <div className="mt-1 text-2xl font-extrabold text-emerald-700">
              {activeCount}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100/60 text-emerald-800">
            <CheckCircle className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("inactive")}
          className={`card flex items-center justify-between p-4 text-left transition-all ${
            filter === "inactive"
              ? "ring-2 ring-slate-400 bg-slate-100"
              : "hover:bg-slate-50/60"
          }`}
        >
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">
              Deactivated
            </div>
            <div className="mt-1 text-2xl font-extrabold text-slate-600">
              {inactiveCount}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
            <User className="h-5 w-5" />
          </div>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="card flex items-center justify-between p-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search physician by name, specialty, or department..."
            className="input-field pl-9 text-xs"
          />
        </div>
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="ml-3 text-xs font-semibold text-teal-800 hover:text-teal-950"
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-800 ring-1 ring-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Doctors Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <th className="px-5 py-3.5">Physician</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Experience</th>
                <th className="px-5 py-3.5">OPD Fee</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingDoctors ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
                    <p className="mt-2">Loading physicians directory...</p>
                  </td>
                </tr>
              ) : filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No physicians found matching the search criteria.
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doc) => {
                  const isActive = doc.status === "active";
                  return (
                    <tr
                      key={doc.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 font-bold text-teal-900">
                            {doc.full_name
                              ? doc.full_name
                                  .replace(/^Dr.s*/i, "")
                                  .slice(0, 2)
                                  .toUpperCase()
                              : "DR"}
                          </div>
                          <div>
                            <div className="font-bold text-teal-950">
                              {doc.full_name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {doc.qualification || doc.specialization}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                          {doc.department_name || "General"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {doc.experience_years ? `${doc.experience_years} years` : "—"}
                      </td>

                      <td className="px-5 py-4 font-semibold text-teal-950">
                        Rs. {Number(doc.consultation_fee || 0).toLocaleString()}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            isActive
                              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {isActive ? "Active" : "Deactivated"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
