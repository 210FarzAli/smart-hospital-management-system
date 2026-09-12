import { useEffect, useState } from "react";
import {
  reportsApi,
  type ReportOverview,
  type ReportPeriod,
} from "../../lib/apiClient";
import {
  TrendingUp,
  Calendar,
  Users,
  Stethoscope,
  Pill,
  DollarSign,
  ShieldCheck,
  Refresh,
  Filter,
  Activity,
} from "../../components/icons/Icons";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function AdminReports() {
  const [stats, setStats] = useState<ReportOverview | null>(null);
  const [period, setPeriod] = useState<ReportPeriod>("all");
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadReport(selectedPeriod: ReportPeriod = period) {
    try {
      setLoading(true);
      setError(null);

      let date: string | undefined;
      if (selectedPeriod === "day" || selectedPeriod === "week") {
        date = selectedDate;
      }
      if (selectedPeriod === "month") {
        date = `${selectedMonth}-01`;
      }

      const data = await reportsApi.overview({
        period: selectedPeriod,
        date,
      });
      setStats(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport("all");
  }, []);

  function handleApplyFilter() {
    loadReport(period);
  }

  function handleReset() {
    setPeriod("all");
    setSelectedDate(getToday());
    setSelectedMonth(getCurrentMonth());
    loadReport("all");
  }

  function money(value: number | undefined) {
    if (value === undefined) return "—";
    return `Rs. ${value.toLocaleString()}`;
  }

  function getReportDescription() {
    if (!stats) return "";
    if (stats.reportPeriod === "all") {
      return "Cumulative hospital performance across all recorded dates.";
    }
    if (stats.reportPeriod === "day") {
      return `Daily financial & OPD summary for ${selectedDate}.`;
    }
    if (stats.reportPeriod === "week") {
      return `Weekly aggregated performance for the week of ${selectedDate}.`;
    }
    if (stats.reportPeriod === "month") {
      return `Monthly operational summary for ${selectedMonth}.`;
    }
    return "";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Executive Financial & OPD Intelligence
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500">
            Audit hospital activity, pharmacy sales revenue, and patient inflow across custom timeframes.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          {/* Period Selector */}
          <div className="w-full lg:w-48">
            <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
              Reporting Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
              className="input-field mt-1.5 text-xs"
            >
              <option value="all">All Time History</option>
              <option value="day">Single Day</option>
              <option value="week">Weekly View</option>
              <option value="month">Monthly Statement</option>
            </select>
          </div>

          {/* Date Picker (for Day and Week) */}
          {(period === "day" || period === "week") && (
            <div className="w-full lg:w-48">
              <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                {period === "day" ? "Select Day" : "Week Reference Date"}
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-field mt-1.5 text-xs"
              />
            </div>
          )}

          {/* Month Picker */}
          {period === "month" && (
            <div className="w-full lg:w-48">
              <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                Select Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="input-field mt-1.5 text-xs"
              />
            </div>
          )}

          {/* Filter Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApplyFilter}
              disabled={loading}
              className="btn-primary inline-flex items-center gap-1.5 text-xs"
            >
              <Filter className="h-3.5 w-3.5" />
              Apply Analysis
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="btn-outline inline-flex items-center gap-1.5 text-xs"
            >
              <Refresh className="h-3.5 w-3.5" />
              Reset All
            </button>
          </div>
        </div>

        {/* Current Period Badge */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span className="font-medium text-teal-900">
            {getReportDescription()}
          </span>
          {stats?.reportPeriod && (
            <span className="rounded-full bg-teal-50 px-2.5 py-0.5 font-semibold text-teal-800 uppercase tracking-wider text-[10px]">
              Active Scope: {stats.reportPeriod}
            </span>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Pharmacy Revenue */}
        <div className="card p-6 bg-gradient-to-br from-teal-900 to-teal-950 text-white shadow-lg shadow-teal-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-teal-200 uppercase">
              Pharmacy Revenue
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-800 text-teal-200">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-extrabold tracking-tight">
            {loading ? "—" : money(stats?.pharmacyRevenue)}
          </div>
          <p className="mt-1 text-xs text-teal-300">
            Total OTC & prescription sales revenue
          </p>
        </div>

        {/* Total Sales Count */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Invoiced Orders
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-800">
              <Pill className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-teal-950">
            {loading ? "—" : stats?.pharmacySales ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Completed counter checkout tickets
          </p>
        </div>

        {/* Total Patients */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Patient Inflow
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-teal-950">
            {loading ? "—" : stats?.patients ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Unique patient medical records
          </p>
        </div>

        {/* Total Appointments */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Consultation Volume
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-teal-950">
            {loading ? "—" : stats?.appointmentsToday ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Scheduled OPD visits for period
          </p>
        </div>
      </div>

      {/* Laboratory Operational Statistics */}
      <div className="card p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-teal-950">
              Laboratory Diagnostics & Pathology Performance
            </h2>
            <p className="text-xs text-slate-500">
              Diagnostic test throughput, home sample requests, and lab pathology billings
            </p>
          </div>
          <span className="badge-teal text-[11px] font-semibold">
            Laboratory Analytics
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Activity className="h-4 w-4 text-teal-700" />
              Total Diagnostic Orders
            </div>
            <div className="mt-1 text-2xl font-bold text-teal-950">
              {stats?.labBookings ?? 0} Orders
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              In-clinic and home collection requests
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              Tests Processed & Released
            </div>
            <div className="mt-1 text-2xl font-bold text-emerald-700">
              {stats?.labCompletedTests ?? 0} Tests
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Pathologist verified diagnostic reports
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <DollarSign className="h-4 w-4 text-teal-700" />
              Laboratory Gross Revenue
            </div>
            <div className="mt-1 text-2xl font-bold text-teal-950">
              {money(stats?.labRevenue ?? 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Diagnostic test billings collected
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}