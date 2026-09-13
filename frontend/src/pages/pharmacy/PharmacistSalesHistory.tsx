import { useEffect, useMemo, useState } from "react";
import { pharmacyApi } from "../../lib/apiClient";
import type { PharmacySale } from "../../lib/apiClient";
import {
  Search,
  Refresh,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
} from "../../components/icons/Icons";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMoney(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString("en-US")}`;
}

export default function PharmacistSalesHistory() {
  const [sales, setSales] = useState<PharmacySale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function loadSales() {
    try {
      setLoading(true);
      setError(null);

      const data = await pharmacyApi.sales();
      setSales(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load sales history."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSales();
  }, []);

  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return sales;

    return sales.filter((sale) => {
      return (
        sale.sale_code?.toLowerCase().includes(q) ||
        sale.receipt_code?.toLowerCase().includes(q) ||
        sale.customer_name?.toLowerCase().includes(q) ||
        sale.customer_phone?.toLowerCase().includes(q) ||
        sale.customer_email?.toLowerCase().includes(q) ||
        sale.referring_doctor?.toLowerCase().includes(q) ||
        sale.sold_by?.toLowerCase().includes(q)
      );
    });
  }, [sales, search]);

  const totalRevenue = useMemo(() => {
    return filteredSales.reduce(
      (sum, sale) => sum + Number(sale.total_amount || 0),
      0
    );
  }, [filteredSales]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Financial Audit & Ledger
          </div>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Pharmacy Sales Journal ({sales.length})
          </h1>

          <p className="text-xs text-slate-500">
            Audit point-of-sale invoices, customer receipt codes, referring
            doctors, and automated dispatch statuses.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSales}
          disabled={loading}
          className="btn-outline inline-flex items-center gap-2 text-xs"
        >
          <Refresh className="h-3.5 w-3.5" />
          Refresh Sales
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-xs font-bold uppercase text-slate-500">
            Completed Invoices
          </div>

          <div className="mt-2 text-3xl font-extrabold text-teal-950">
            {filteredSales.length}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            Filtered transaction tickets
          </div>
        </div>

        <div className="card p-5">
          <div className="text-xs font-bold uppercase text-slate-500">
            Net Revenue
          </div>

          <div className="mt-2 text-3xl font-extrabold text-teal-700">
            {formatMoney(totalRevenue)}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            Total for displayed sales
          </div>
        </div>

        <div className="card p-5">
          <div className="text-xs font-bold uppercase text-slate-500">
            Average Basket Value
          </div>

          <div className="mt-2 text-3xl font-extrabold text-teal-950">
            {filteredSales.length > 0
              ? formatMoney(
                  Math.round(totalRevenue / filteredSales.length)
                )
              : "Rs. 0"}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            Per transaction average
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="card flex items-center gap-3 p-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by sale code, receipt, customer, referring doctor, or dispensing staff..."
            className="input-field pl-9 text-xs"
          />
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      {/* Sales Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Invoice Code</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Channel</th>
                <th className="px-5 py-3.5">Referring Doctor</th>
                <th className="px-5 py-3.5">Total Amount</th>
                <th className="px-5 py-3.5">Dispensed By</th>
                <th className="px-5 py-3.5">Receipt Token</th>
                <th className="px-5 py-3.5">Email Status</th>
                <th className="px-5 py-3.5 text-right">Date & Time</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-8 text-center text-slate-400"
                  >
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />

                    <p className="mt-2">
                      Loading sales journal...
                    </p>
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-8 text-center text-slate-500"
                  >
                    No sales found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const channel =
                    sale.sale_type === "online"
                      ? "ONLINE"
                      : sale.sale_type === "prescription" || sale.referring_doctor
                      ? "DOCTOR-REFERRED / PRESCRIBED"
                      : "WALK-IN / PHYSICAL";

                  return (
                    <tr
                      key={sale.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      {/* Invoice */}
                      <td className="px-5 py-4">
                        <div className="font-mono text-xs font-bold text-teal-950">
                          {sale.sale_code}
                        </div>

                        <div className="font-mono text-[10px] text-slate-400">
                          ID: {sale.id.slice(0, 8)}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">
                          {sale.customer_name || "Walk-in Customer"}
                        </div>

                        <div className="text-[10px] text-slate-400">
                          {sale.customer_phone ||
                            sale.customer_email ||
                            "No contact info"}
                        </div>
                      </td>

                      {/* Channel */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            channel === "ONLINE"
                              ? "bg-blue-50 text-blue-800 ring-1 ring-blue-200"
                              : channel === "DOCTOR-REFERRED / PRESCRIBED"
                              ? "bg-purple-50 text-purple-800 ring-1 ring-purple-200"
                              : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                          }`}
                        >
                          {channel}
                        </span>
                      </td>

                      {/* Referring Doctor */}
                      <td className="px-5 py-4">
                        {sale.referring_doctor ? (
                          <>
                            <div className="font-bold text-slate-900">
                              {sale.referring_doctor}
                            </div>

                            <div className="mt-0.5 text-[10px] text-teal-700">
                              Hospital Referral
                            </div>
                          </>
                        ) : (
                          <div className="text-slate-400">
                            Walk-in / N/A
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-4 font-extrabold text-teal-950">
                        {formatMoney(sale.total_amount)}
                      </td>

                      {/* Dispensed By */}
                      <td className="px-5 py-4 text-slate-700">
                        {sale.sold_by || "Staff Pharmacist"}
                      </td>

                      {/* Receipt Token */}
                      <td className="px-5 py-4">
                        <div className="font-mono text-xs font-semibold text-slate-800">
                          {sale.receipt_code || "—"}
                        </div>
                        <div className="text-[10px] text-slate-400">Ref Token</div>
                      </td>

                      {/* Email Status */}
                      <td className="px-5 py-4">
                        {sale.email_status === "sent" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                            <CheckCircle className="h-3 w-3" />
                            Receipt Emailed
                          </span>
                        ) : sale.email_status === "failed" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-rose-200">
                            <AlertCircle className="h-3 w-3" />
                            Email Failed
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            Not Requested
                          </span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="whitespace-nowrap px-5 py-4 text-right text-slate-500">
                        {formatDate(sale.created_at)}
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