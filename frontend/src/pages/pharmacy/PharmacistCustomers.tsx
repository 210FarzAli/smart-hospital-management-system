import { useEffect, useState } from "react";
import {
  pharmacyApi,
  type PharmacyCustomer,
} from "../../lib/apiClient";

function formatDate(value: string | null) {
  if (!value) return "No purchases yet";

  return new Date(value).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PharmacistCustomers() {
  const [customers, setCustomers] = useState<PharmacyCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCustomers() {
    try {
      setLoading(true);
      setError(null);

      const data = await pharmacyApi.customers();
      setCustomers(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load customers."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-teal-700">
            Pharmacy Customers
          </p>

          <h1 className="mt-1 text-2xl font-semibold text-teal-950">
            Customers
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View pharmacy customers and their purchase activity.
          </p>
        </div>

        <button
          type="button"
          onClick={loadCustomers}
          disabled={loading}
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-teal-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-teal-950">
            Customer Records
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {customers.length} customer
            {customers.length === 1 ? "" : "s"} found.
          </p>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">
            Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No pharmacy customers found yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">
                    Customer
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Contact
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Purchases
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Total Spent
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Last Purchase
                  </th>
                </tr>
              </thead>

              <tbody>
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800">
                        {customer.full_name}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {customer.customer_code}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-slate-700">
                        {customer.phone || "—"}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {customer.email || "No email"}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-800">
                      {customer.purchase_count}
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-800">
                      Rs.{" "}
                      {Number(customer.total_spent).toFixed(2)}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {formatDate(customer.last_purchase_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}