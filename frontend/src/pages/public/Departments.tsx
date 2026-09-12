import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { departmentsApi } from "../../lib/apiClient";
import type { Department } from "../../lib/types";
import { getPatientFriendlyDepartmentName } from "../../lib/departmentUtils";
import {
  HospitalIcon,
  ActivityIcon,
  ArrowRightIcon,
  SearchIcon,
  CheckCircleIcon,
} from "../../components/icons/Icons";

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    departmentsApi
      .list()
      .then((data) => {
        setDepartments(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filtered = departments.filter((d) => {
    const text = `${d.name} ${d.description || ""} ${d.services?.join(" ") || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header Banner */}
      <div className="border-b border-slate-200/80 bg-gradient-to-r from-teal-950 via-slate-900 to-teal-900 py-14 text-white px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-300 mb-4">
            <HospitalIcon className="w-3.5 h-3.5" />
            <span>Clinical Specialties</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Medical Departments
          </h1>

          <p className="mt-3 max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed">
            Our multidisciplinary departments provide round-the-clock specialized care,
            modern diagnostic support, and dedicated OPD consulting shifts.
          </p>

          {/* Quick Search */}
          <div className="mt-8 max-w-md relative">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search departments or clinical services..."
              className="w-full rounded-xl border border-teal-500/30 bg-white/10 backdrop-blur-md py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-300 outline-none transition focus:border-teal-400 focus:bg-white/20 focus:ring-2 focus:ring-teal-400/20"
            />
          </div>
        </div>
      </div>

      {/* Department Cards Grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 -mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-56 rounded-2xl bg-white border border-slate-200 animate-pulse p-6"></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <HospitalIcon className="mx-auto w-12 h-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-bold text-slate-800">No departments match your search</h3>
            <p className="mt-1 text-sm text-slate-500">Try searching with different medical terms.</p>
            <button
              onClick={() => setSearch("")}
              className="btn-secondary mt-4"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-6">
            {filtered.map((d) => (
              <Link
                key={d.id}
                to={`/departments/${d.id}`}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-teal-400 hover:shadow-card"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-800 group-hover:bg-teal-900 group-hover:text-white transition-all duration-200 shadow-sm">
                      <ActivityIcon className="w-7 h-7" />
                    </div>

                    <span className="badge-teal">
                      <CheckCircleIcon className="w-3 h-3 text-teal-600" />
                      Active OPD
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-slate-900 group-hover:text-teal-900 transition-colors">
                    {getPatientFriendlyDepartmentName(d.name)}
                  </h3>

                  <p className="mt-2.5 text-xs leading-relaxed text-slate-500 line-clamp-3">
                    {d.description || "Comprehensive clinical diagnosis, treatment plans, and continuous patient care."}
                  </p>

                  {d.services && d.services.length > 0 && (
                    <div className="mt-5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                        Key Services:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {d.services.map((s) => (
                          <span
                            key={s}
                            className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200/60 group-hover:border-teal-200 transition-colors"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-teal-800 group-hover:text-teal-600">
                  <span>View Department Specialists</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-teal-800 group-hover:bg-teal-900 group-hover:text-white transition-all duration-200">
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
