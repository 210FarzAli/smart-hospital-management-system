import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { hrApi } from "../../lib/apiClient";
import type { HRDashboardStats } from "../../lib/types";
import {
  Users,
  DollarSign,
  Building,
  Calendar,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Activity,
  FileText,
} from "../../components/icons/Icons";

export default function HRDashboard() {
  const [data, setData] = useState<HRDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const res = await hrApi.dashboard();
      setData(res);
    } catch (err) {
      console.error("Failed to load HR dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
          Loading HR Overview...
        </div>
      </div>
    );
  }

  const stats = data?.stats || {
    total_employees: 0,
    active_employees: 0,
    on_leave_employees: 0,
    terminated_employees: 0,
  };

  const latestPayroll = data?.latestPayroll;

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Human Resources Management
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Workforce & Payroll Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Live metrics on hospital staff headcount, department distribution, and payroll allocations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/hr/employees"
            className="btn-primary inline-flex items-center gap-2 text-xs"
          >
            <Users className="h-4 w-4" />
            <span>Manage Employees</span>
          </Link>
          <Link
            to="/hr/payroll"
            className="btn-outline inline-flex items-center gap-2 text-xs"
          >
            <DollarSign className="h-4 w-4" />
            <span>Generate Payroll</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Workforce</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-teal-950">
            {stats.total_employees}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Registered hospital staff profiles
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Staff</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700">
            {stats.active_employees}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Currently on active duty
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">On Leave / Rest</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600">
            {stats.on_leave_employees}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Approved leaves & rotations
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Latest Monthly Payroll</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-extrabold text-teal-950">
            Rs. {Number(latestPayroll?.total_net_payout || 0).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {latestPayroll ? `Month ${latestPayroll.period_month}/${latestPayroll.period_year} payout` : "No payroll generated yet"}
          </div>
        </div>
      </div>

      {/* Main Content: Department Distribution & Recent Hires */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Department Staffing */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-extrabold text-teal-950">Department Staffing Levels</h2>
              <p className="text-[11px] text-slate-500">Staff distribution across medical and clinical divisions</p>
            </div>
            <Link to="/hr/employees" className="text-xs font-semibold text-teal-700 hover:text-teal-900">
              View All →
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            {data?.departmentBreakdown && data.departmentBreakdown.length > 0 ? (
              data.departmentBreakdown.map((dept) => {
                const total = stats.total_employees || 1;
                const pct = Math.round((dept.employee_count / total) * 100);
                return (
                  <div key={dept.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span className="flex items-center gap-2">
                        <Building className="h-3.5 w-3.5 text-teal-600" />
                        {dept.name}
                      </span>
                      <span className="text-slate-500">
                        {dept.employee_count} staff ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-teal-600 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400">No departments configured.</p>
            )}
          </div>
        </div>

        {/* Recent Hires */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-extrabold text-teal-950">Recent Employee Hires</h2>
              <p className="text-[11px] text-slate-500">Latest staff onboarding</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {data?.recentHires && data.recentHires.length > 0 ? (
              data.recentHires.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-900">{emp.full_name}</p>
                    <p className="text-[11px] text-slate-500">{emp.designation}</p>
                    <span className="inline-block mt-1 rounded bg-teal-50 px-1.5 py-0.5 text-[9px] font-semibold text-teal-700">
                      {emp.department_name || "General"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Active
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">No employees registered yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
