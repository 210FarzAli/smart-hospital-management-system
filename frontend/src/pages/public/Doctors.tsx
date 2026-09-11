import { useEffect, useState } from "react";
import { departmentsApi, doctorsApi } from "../../lib/apiClient";
import type { Department, Doctor } from "../../lib/types";
import DoctorCard from "../../components/DoctorCard";
import {
  SearchIcon,
  UsersIcon,
  StethoscopeIcon,
  RefreshIcon,
} from "../../components/icons/Icons";

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    departmentsApi.list().then(setDepartments).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    doctorsApi
      .list(departmentId !== "all" ? { departmentId } : {})
      .then((data) => {
        setDoctors(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [departmentId]);

  const filtered = doctors.filter(
    (d) =>
      d.full_name.toLowerCase().includes(search.toLowerCase()) ||
      d.specialization.toLowerCase().includes(search.toLowerCase()) ||
      (d.department_name && d.department_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header Banner */}
      <div className="border-b border-slate-200/80 bg-gradient-to-r from-teal-950 via-slate-900 to-teal-900 py-14 text-white px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-300 mb-4">
            <StethoscopeIcon className="w-3.5 h-3.5" />
            <span>Consultant Specialists</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Find a Doctor
          </h1>

          <p className="mt-3 max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed">
            Search our medical faculty by name, clinical specialization, or department.
            View qualifications, fees, and open OPD consulting shifts.
          </p>

          {/* Search & Department Selector */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                className="w-full rounded-xl border border-teal-500/30 bg-white/10 backdrop-blur-md py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-300 outline-none transition focus:border-teal-400 focus:bg-white/20 focus:ring-2 focus:ring-teal-400/20"
                placeholder="Search by doctor name or specialization..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="rounded-xl border border-teal-500/30 bg-teal-950/80 backdrop-blur-md py-3 px-4 text-sm text-white outline-none transition focus:border-teal-400 sm:w-60"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="all" className="bg-slate-900 text-white">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-8">
        {/* Department Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setDepartmentId("all")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
              departmentId === "all"
                ? "bg-teal-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:border-teal-300 hover:text-teal-900"
            }`}
          >
            All Departments ({doctors.length})
          </button>

          {departments.map((d) => (
            <button
              key={d.id}
              onClick={() => setDepartmentId(d.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                departmentId === d.id
                  ? "bg-teal-900 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-teal-300 hover:text-teal-900"
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>

        {/* Results Bar */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Showing {filtered.length} {filtered.length === 1 ? "Doctor" : "Doctors"}
          </p>

          {(search || departmentId !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setDepartmentId("all");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:underline"
            >
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Doctors Grid */}
        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse p-6"></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-14 text-center shadow-sm">
            <UsersIcon className="mx-auto w-12 h-12 text-slate-300" />
            <h3 className="mt-4 text-base font-bold text-slate-800">
              No doctors found
            </h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              No doctors match "{search}". Try searching for another specialty or resetting the department filter.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setDepartmentId("all");
              }}
              className="btn-secondary mt-6"
            >
              View All Doctors
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((doc) => (
              <DoctorCard key={doc.id} doctor={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
