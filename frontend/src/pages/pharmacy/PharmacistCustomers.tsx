import { useEffect, useMemo, useState } from "react";
import {
  pharmacyApi,
  type PharmacyCustomerRecord,
} from "../../lib/apiClient";
import {
  Users,
  Search,
  User,
  Phone,
  Mail,
  DollarSign,
  Calendar,
  Refresh,
  ShieldCheck,
} from "../../components/icons/Icons";

function formatDate(value: string | null) {
  if (!value) return "No purchases yet";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PharmacistCustomers() {
  const [customers, setCustomers] = useState<PharmacyCustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function loadCustomers() {
    try {
      setLoading(true);
      setError(null);
      const data = await pharmacyApi.customers();
      setCustomers(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load customers."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;

    return customers.filter((c) => {
      return (
        c.full_name?.toLowerCase().includes(q) ||
        c.customer_code?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    });
  }, [customers, search]);

  const totalRevenue = useMemo(() => {
    return customers.reduce((sum, c) => sum + Number(c.total_spent || 0), 0);
  }, [customers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Dispensary Customer Accounts
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Pharmacy Customers ({customers.length})
          </h1>
          <p className="text-xs text-slate-500">
            Track customer purchase history, cumulative pharmacy spending, and contact details.
          </p>
        </div>

        <button
          type="button"
          onClick={loadCustomers}
          disabled={loading}
          className="btn-outline inline-flex items-center gap-2 text-xs"
        >
          <Refresh className="h-3.5 w-3.5" />
          Refresh Customers
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-xs font-bold text-slate-500 uppercase">
            Total Customers
          </div>
          <div className="mt-2 text-3xl font-extrabold text-teal-950">
            {customers.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Registered pharmacy accounts
          </div>
        </div>

        <div className="card p-5">
          <div className="text-xs font-bold text-slate-500 uppercase">
            Cumulative Customer Spend
          </div>
          <div className="mt-2 text-3xl font-extrabold text-teal-950">
            Rs. {totalRevenue.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Across all transactions
          </div>
        </div>

        <div className="card p-5">
          <div className="text-xs font-bold text-slate-500 uppercase">
            Average Spend / Customer
          </div>
          <div className="mt-2 text-3xl font-extrabold text-teal-700">
            Rs.{" "}
            {customers.length > 0
              ? Math.round(totalRevenue / customers.length).toLocaleString()
              : "0"}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Customer lifetime value
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
            placeholder="Search by customer name, customer code, phone, or email..."
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

      {/* Customers Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Customer & ID</th>
                <th className="px-5 py-3.5">Contact Details</th>
                <th className="px-5 py-3.5">Channel</th>
                <th className="px-5 py-3.5">Total Orders</th>
                <th className="px-5 py-3.5">Lifetime Spend</th>
                <th className="px-5 py-3.5 text-right">Last Purchase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
                    <p className="mt-2">Loading customer accounts...</p>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No customers found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 font-bold text-teal-900">
                          {c.full_name ? c.full_name.charAt(0).toUpperCase() : "C"}
                        </div>
                        <div>
                          <div className="font-bold text-teal-950">
                            {c.full_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {c.customer_code}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-slate-800">{c.phone || "—"}</div>
                      <div className="text-[10px] text-slate-400">
                        {c.email || "—"}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          (c as any).channel === "ONLINE"
                            ? "bg-blue-50 text-blue-800 ring-1 ring-blue-200"
                            : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                        }`}
                      >
                        {(c as any).channel || "WALK-IN / PHYSICAL"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 font-bold text-slate-700">
                        {c.purchase_count ?? 0} {c.purchase_count === 1 ? "order" : "orders"}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-bold text-teal-950">
                      Rs. {Number(c.total_spent || 0).toLocaleString()}
                    </td>

                    <td className="px-5 py-4 text-right text-slate-600 font-medium">
                      {formatDate(c.last_purchase_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}