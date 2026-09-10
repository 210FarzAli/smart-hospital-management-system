import { useEffect, useState } from "react";
import {
  reportsApi,
  type ReportOverview,
  type ReportPeriod,
} from "../../lib/apiClient";

function getToday() {
  return new Date()
    .toISOString()
    .split("T")[0];
}

function getCurrentMonth() {
  return new Date()
    .toISOString()
    .slice(0, 7);
}

export default function AdminReports() {
  const [stats, setStats] =
    useState<ReportOverview | null>(null);

  const [period, setPeriod] =
    useState<ReportPeriod>("all");

  const [selectedDate, setSelectedDate] =
    useState(getToday());

  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  // ============================================================
  // LOAD REPORT
  // ============================================================
  async function loadReport(
    selectedPeriod: ReportPeriod = period
  ) {
    try {
      setLoading(true);
      setError(null);

      let date: string | undefined;

      if (
        selectedPeriod === "day" ||
        selectedPeriod === "week"
      ) {
        date = selectedDate;
      }

      if (selectedPeriod === "month") {
        date = `${selectedMonth}-01`;
      }

      const data =
        await reportsApi.overview({
          period: selectedPeriod,
          date,
        });

      setStats(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load report."
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // INITIAL REPORT
  // ============================================================
  useEffect(() => {
    loadReport("all");
  }, []);

  // ============================================================
  // APPLY FILTER
  // ============================================================
  function handleApplyFilter() {
    loadReport(period);
  }

  // ============================================================
  // RESET FILTER
  // ============================================================
  function handleReset() {
    setPeriod("all");
    setSelectedDate(getToday());
    setSelectedMonth(getCurrentMonth());

    loadReport("all");
  }

  // ============================================================
  // MONEY FORMAT
  // ============================================================
  function money(value: number | undefined) {
    if (value === undefined) {
      return "—";
    }

    return `Rs. ${value.toFixed(0)}`;
  }

  // ============================================================
  // REPORT LABEL
  // ============================================================
  function getReportDescription() {
    if (!stats) {
      return "";
    }

    if (stats.reportPeriod === "all") {
      return "Showing all pharmacy sales and revenue.";
    }

    if (stats.reportPeriod === "day") {
      return `Showing pharmacy sales for ${selectedDate}.`;
    }

    if (stats.reportPeriod === "week") {
      return `Showing the complete week containing ${selectedDate}.`;
    }

    if (stats.reportPeriod === "month") {
      return `Showing pharmacy sales for ${selectedMonth}.`;
    }

    return "";
  }

  return (
    <div>
      {/* ========================================================
          HEADER
      ======================================================== */}
      <div>
        <h1 className="text-2xl font-semibold text-teal-950">
          Reports & Analytics
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Monitor hospital activity and pharmacy
          financial performance.
        </p>
      </div>

      {/* ========================================================
          REPORT FILTER
      ======================================================== */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-base font-semibold text-teal-950">
            Report Filter
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select the period you want to analyze.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end">
          {/* Period */}
          <div className="w-full lg:w-52">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Report Period
            </label>

            <select
              className="input-field w-full"
              value={period}
              onChange={(e) =>
                setPeriod(
                  e.target.value as ReportPeriod
                )
              }
            >
              <option value="all">
                All Time
              </option>

              <option value="day">
                Day
              </option>

              <option value="week">
                Week
              </option>

              <option value="month">
                Month
              </option>
            </select>
          </div>

          {/* Day / Week date */}
          {(period === "day" ||
            period === "week") && (
            <div className="w-full lg:w-56">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {period === "day"
                  ? "Select Date"
                  : "Select Date in Week"}
              </label>

              <input
                type="date"
                className="input-field w-full"
                value={selectedDate}
                onChange={(e) =>
                  setSelectedDate(
                    e.target.value
                  )
                }
              />
            </div>
          )}

          {/* Month */}
          {period === "month" && (
            <div className="w-full lg:w-56">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Select Month
              </label>

              <input
                type="month"
                className="input-field w-full"
                value={selectedMonth}
                onChange={(e) =>
                  setSelectedMonth(
                    e.target.value
                  )
                }
              />
            </div>
          )}

          {/* Apply */}
          <button
            type="button"
            onClick={handleApplyFilter}
            disabled={loading}
            className="btn-primary"
          >
            {loading
              ? "Loading..."
              : "Apply Filter"}
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="rounded-md border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ========================================================
          ERROR
      ======================================================== */}
      {error && (
        <div className="mt-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ========================================================
          PHARMACY REPORT
      ======================================================== */}
      <div className="mt-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-teal-950">
            Pharmacy Financial Report
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {getReportDescription()}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Sales */}
          <div className="card">
            <div className="text-sm text-slate-500">
              Pharmacy Sales
            </div>

            <div className="mt-2 text-3xl font-semibold text-teal-950">
              {loading
                ? "—"
                : stats?.pharmacySales ?? 0}
            </div>

            <div className="mt-2 text-sm text-slate-500">
              Completed sales in selected period
            </div>
          </div>

          {/* Revenue */}
          <div className="card">
            <div className="text-sm text-slate-500">
              Pharmacy Revenue
            </div>

            <div className="mt-2 text-3xl font-semibold text-teal-950">
              {loading
                ? "—"
                : money(
                    stats?.pharmacyRevenue
                  )}
            </div>

            <div className="mt-2 text-sm text-slate-500">
              Total revenue in selected period
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          SELECTED PERIOD SUMMARY
      ======================================================== */}
      <div className="mt-6 rounded-lg border border-teal-100 bg-teal-50 p-5">
        <div className="text-sm font-medium text-teal-800">
          Current Report
        </div>

        <div className="mt-1 text-lg font-semibold text-teal-950">
          {stats?.reportPeriodLabel ||
            "All Time"}
        </div>

        <div className="mt-1 text-sm text-teal-700">
          {stats?.pharmacySales ?? 0} sales
          {" • "}
          {money(
            stats?.pharmacyRevenue
          )}{" "}
          revenue
        </div>
      </div>

      {/* ========================================================
          HOSPITAL OVERVIEW
      ======================================================== */}
      <div className="mt-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-teal-950">
            Hospital Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Current hospital activity and review statistics.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Doctors */}
          <div className="card">
            <div className="text-sm text-slate-500">
              Doctors
            </div>

            <div className="mt-1 text-3xl font-semibold text-teal-950">
              {loading
                ? "—"
                : stats?.doctors ?? 0}
            </div>
          </div>

          {/* Patients */}
          <div className="card">
            <div className="text-sm text-slate-500">
              Patients
            </div>

            <div className="mt-1 text-3xl font-semibold text-teal-950">
              {loading
                ? "—"
                : stats?.patients ?? 0}
            </div>
          </div>

          {/* Reviews */}
          <div className="card">
            <div className="text-sm text-slate-500">
              Total Reviews
            </div>

            <div className="mt-1 text-3xl font-semibold text-teal-950">
              {loading
                ? "—"
                : stats?.totalReviews ?? 0}
            </div>
          </div>

          {/* Rating */}
          <div className="card">
            <div className="text-sm text-slate-500">
              Average Rating
            </div>

            <div className="mt-1 text-3xl font-semibold text-teal-950">
              {loading
                ? "—"
                : stats?.averageRating.toFixed(
                    1
                  )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}