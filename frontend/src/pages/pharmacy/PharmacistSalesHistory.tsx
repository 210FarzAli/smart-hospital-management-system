import { useEffect, useMemo, useState } from "react";
import { pharmacyApi } from "../../lib/apiClient";
import type { PharmacySale } from "../../lib/apiClient";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMoney(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
    const value = search.trim().toLowerCase();

    if (!value) return sales;

    return sales.filter((sale) => {
      return (
        sale.sale_code?.toLowerCase().includes(value) ||
        sale.receipt_code?.toLowerCase().includes(value) ||
        sale.customer_name?.toLowerCase().includes(value) ||
        sale.customer_phone?.toLowerCase().includes(value) ||
        sale.customer_email?.toLowerCase().includes(value) ||
        sale.sold_by?.toLowerCase().includes(value)
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Sales History
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View previous pharmacy sales, customers, receipts and revenue.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSales}
          disabled={loading}
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Sales</p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {filteredSales.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Revenue</p>

          <p className="mt-2 text-2xl font-bold text-teal-700">
            {formatMoney(totalRevenue)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Showing</p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {filteredSales.length}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            of {sales.length} recorded sales
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Search Sales
        </label>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by sale code, receipt, customer, phone or pharmacist..."
          className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Loading sales history...
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filteredSales.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            No sales found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {search
              ? "No sales match your search."
              : "No pharmacy sales have been recorded yet."}
          </p>
        </div>
      )}

      {/* Desktop table */}
      {!loading && filteredSales.length > 0 && (
        <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sale
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Customer
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Type
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Amount
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sold By
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Receipt
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">
                        {sale.sale_code}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {sale.id}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-800">
                        {sale.customer_name || "Walk-in Customer"}
                      </div>

                      {sale.customer_phone && (
                        <div className="mt-1 text-xs text-slate-500">
                          {sale.customer_phone}
                        </div>
                      )}

                      {sale.customer_email && (
                        <div className="mt-1 text-xs text-slate-500">
                          {sale.customer_email}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
                        {sale.sale_type?.replace("_", " ") || "Unknown"}
                      </span>
                    </td>

                    <td className="px-4 py-4 font-semibold text-teal-700">
                      {formatMoney(sale.total_amount)}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700">
                      {sale.sold_by || "Unknown"}
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-slate-800">
                        {sale.receipt_code || "—"}
                      </div>

                      <div className="mt-1 text-xs">
                        {sale.email_status === "sent" && (
                          <span className="text-green-600">
                            Email Sent
                          </span>
                        )}

                        {sale.email_status === "failed" && (
                          <span className="text-red-600">
                            Email Failed
                          </span>
                        )}

                        {(!sale.email_status ||
                          sale.email_status === "not_sent") && (
                          <span className="text-slate-400">
                            Not Sent
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                      {formatDate(sale.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile cards */}
      {!loading && filteredSales.length > 0 && (
        <div className="space-y-4 lg:hidden">
          {filteredSales.map((sale) => (
            <div
              key={sale.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Sale
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {sale.sale_code}
                  </p>
                </div>

                <p className="font-bold text-teal-700">
                  {formatMoney(sale.total_amount)}
                </p>
              </div>

              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Customer
                  </span>

                  <span className="text-right font-medium text-slate-800">
                    {sale.customer_name || "Walk-in Customer"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Type
                  </span>

                  <span className="capitalize text-slate-800">
                    {sale.sale_type?.replace("_", " ") || "Unknown"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Sold By
                  </span>

                  <span className="text-right text-slate-800">
                    {sale.sold_by || "Unknown"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Receipt
                  </span>

                  <span className="text-right text-slate-800">
                    {sale.receipt_code || "—"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Email
                  </span>

                  <span>
                    {sale.email_status === "sent" ? (
                      <span className="text-green-600">
                        Sent
                      </span>
                    ) : sale.email_status === "failed" ? (
                      <span className="text-red-600">
                        Failed
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        Not Sent
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Date
                  </span>

                  <span className="text-right text-slate-800">
                    {formatDate(sale.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}