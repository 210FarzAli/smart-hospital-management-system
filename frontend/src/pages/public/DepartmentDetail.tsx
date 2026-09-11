import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { departmentsApi, doctorsApi } from "../../lib/apiClient";
import type { Department, Doctor } from "../../lib/types";
import DoctorCard from "../../components/DoctorCard";
import {
  HospitalIcon,
  ChevronRightIcon,
  ActivityIcon,
  UsersIcon,
  CheckCircleIcon,
  CalendarIcon,
} from "../../components/icons/Icons";

export default function DepartmentDetail() {
  const { id } = useParams();
  const [department, setDepartment] = useState<Department | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      departmentsApi.get(id),
      doctorsApi.list({ departmentId: id }),
    ])
      .then(([dept, docs]) => {
        setDepartment(dept);
        setDoctors(docs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="h-40 rounded-3xl bg-slate-100 animate-pulse"></div>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 text-center">
        <HospitalIcon className="mx-auto w-12 h-12 text-slate-300" />
        <h2 className="mt-4 text-xl font-bold text-slate-800">Department Not Found</h2>
        <p className="mt-2 text-sm text-slate-500">The requested medical department does not exist.</p>
        <Link to="/departments" className="btn-primary mt-6">
          Back to Departments
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header Banner */}
      <div className="border-b border-slate-200/80 bg-gradient-to-r from-teal-950 via-slate-900 to-teal-900 py-12 text-white px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-teal-200/80 mb-4 font-medium">
            <Link to="/" className="hover:text-white transition">Home</Link>
            <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400" />
            <Link to="/departments" className="hover:text-white transition">Departments</Link>
            <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-white font-semibold">{department.name}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-300 ring-1 ring-teal-400/30">
                  <ActivityIcon className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                    {department.name}
                  </h1>
                  <span className="badge-teal mt-1">
                    <CheckCircleIcon className="w-3 h-3 text-teal-700" />
                    Specialized Inpatient & OPD
                  </span>
                </div>
              </div>

              <p className="text-sm sm:text-base leading-relaxed text-slate-300 pt-1">
                {department.description || "Comprehensive clinical diagnosis, evidence-based care, and dedicated OPD consultation shifts."}
              </p>

              {/* Services Tags */}
              {department.services && department.services.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-teal-300 block mb-2">
                    Department Clinical Services:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {department.services.map((s) => (
                      <span
                        key={s}
                        className="rounded-lg bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-medium text-white border border-white/10"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats Pill */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md lg:w-72">
              <div className="flex items-center gap-3">
                <UsersIcon className="w-6 h-6 text-teal-300" />
                <div>
                  <div className="text-2xl font-extrabold text-white">{doctors.length}</div>
                  <div className="text-xs text-slate-300">Staff Specialists</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <Link
                  to="/book"
                  className="btn-primary w-full py-2.5 text-xs font-bold"
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span>Book in {department.name}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Specialists List */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Department Specialists & Consultants
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a specialist to view their OPD consultation schedule and book an appointment.
            </p>
          </div>
        </div>

        {doctors.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <UsersIcon className="mx-auto w-12 h-12 text-slate-300" />
            <h3 className="mt-4 text-base font-bold text-slate-800">
              No doctors listed currently for this department
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Our medical administration is currently assigning shifts for this specialty.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.map((doc) => (
              <DoctorCard key={doc.id} doctor={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
