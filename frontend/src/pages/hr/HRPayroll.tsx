import { useEffect, useState, FormEvent } from "react";
import { hrApi } from "../../lib/apiClient";
import type { PayrollRecord } from "../../lib/types";
import {
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  Building,
  Plus,
  X,
  AlertCircle,
  FileText,
} from "../../components/icons/Icons";

export default function HRPayroll() {
  const currentDate = new Date();
  const [month, setMonth] = useState(String(currentDate.getMonth() + 1));
  const [year, setYear] = useState(String(currentDate.getFullYear()));
  const [status, setStatus] = useState("all");
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Run Payroll Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genMonth, setGenMonth] = useState(String(currentDate.getMonth() + 1));
  const [genYear, setGenYear] = useState(String(currentDate.getFullYear()));
  const [genMessage, setGenMessage] = useState<string | null>(null);

  async function loadPayroll() {
    setLoading(true);
    try {
      const records = await hrApi.payroll({ month, year, status });
      setPayroll(records || []);
    } catch (err) {
      console.error("Failed to load payroll:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayroll();
  }, [month, year, status]);

  async function handleGeneratePayroll(e: FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setGenMessage(null);
    try {
      const res = await hrApi.generatePayroll(Number(genMonth), Number(genYear));
      setGenMessage(res.message);
      loadPayroll();
      setTimeout(() => {
        setIsModalOpen(false);
        setGenMessage(null);
      }, 1500);
    } catch (err: any) {
      setGenMessage(err.message || "Failed to generate payroll.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleMarkPaid(id: string) {
    try {
      await hrApi.markPayrollPaid(id, "paid");
      loadPayroll();
    } catch (err: any) {
      alert(err.message || "Failed to update payment status.");
    }
  }

  const totalPayout = payroll.reduce((sum, p) => sum + Number(p.net_salary || 0), 0);
  const paidPayout = payroll
    .filter((p) => p.payment_status === "paid")
    .reduce((sum, p) => sum + Number(p.net_salary || 0), 0);
  const pendingPayout = totalPayout - paidPayout;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Hospital Payroll & Compensation
          </h1>
          <p className="text-xs text-slate-500">
            Generate monthly staff payroll runs, disburse compensations, and track remuneration records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="btn-primary inline-flex items-center gap-2 text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Execute Monthly Payroll Run</span>
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Total Net Payroll Allocated</div>
          <div className="mt-2 text-2xl font-extrabold text-teal-950">
            Rs. {totalPayout.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">{payroll.length} staff pay slips</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Disbursed (Paid)</div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700">
            Rs. {paidPayout.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {payroll.filter((p) => p.payment_status === "paid").length} cleared payments
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Pending Authorization</div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600">
            Rs. {pendingPayout.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {payroll.filter((p) => p.payment_status !== "paid").length} pending disbursement
          </div>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Calendar className="h-4 w-4 text-teal-600" />
          <span>Payroll Period Filter:</span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
          >
            <option value="all">All Months</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2026, i, 1).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
          >
            <option value="all">All Years</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Payroll Records Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
              Loading payroll records...
            </div>
          </div>
        ) : payroll.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No payroll records found for this period. Click "Execute Monthly Payroll Run" to generate pay slips.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Period</th>
                  <th className="px-5 py-3.5">Basic</th>
                  <th className="px-5 py-3.5">Allowances</th>
                  <th className="px-5 py-3.5">Deductions</th>
                  <th className="px-5 py-3.5">Net Payout</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payroll.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{p.employee_name}</div>
                      <div className="text-[11px] text-slate-500">{p.designation}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <Building className="h-3 w-3 text-slate-400" />
                        {p.department_name || "General"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700 font-medium">
                      {p.period_month}/{p.period_year}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      Rs. {Number(p.basic_salary).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      Rs. {Number(p.allowances).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-red-600">
                      - Rs. {Number(p.deductions).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 font-extrabold text-teal-950">
                      Rs. {Number(p.net_salary).toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          p.payment_status === "paid"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                        }`}
                      >
                        {p.payment_status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {p.payment_status !== "paid" && (
                        <button
                          type="button"
                          onClick={() => handleMarkPaid(p.id)}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 transition"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Payroll Run Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-teal-950">Generate Monthly Payroll</h3>
                <p className="text-xs text-slate-500">Calculate salaries for all active hospital employees</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {genMessage && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-teal-50 p-3 text-xs text-teal-800">
                <CheckCircle className="h-4 w-4 shrink-0 text-teal-600" />
                <span>{genMessage}</span>
              </div>
            )}

            <form onSubmit={handleGeneratePayroll} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Salary Month</label>
                  <select
                    value={genMonth}
                    onChange={(e) => setGenMonth(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-600 focus:outline-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2026, i, 1).toLocaleString("default", { month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Salary Year</label>
                  <select
                    value={genYear}
                    onChange={(e) => setGenYear(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-600 focus:outline-none"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-500 leading-relaxed">
                This will automatically scan all active employees with assigned salary structures and create pending payroll records for the specified month without duplicating existing runs.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="btn-primary text-xs"
                >
                  {generating ? "Generating..." : "Execute Payroll Run"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
