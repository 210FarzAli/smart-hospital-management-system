import { useEffect, useState } from "react";
import { pharmacyApi } from "../../lib/apiClient";

interface Medicine {
  id: string;
  name: string;
  category: string | null;
  unit_price: number;
  reorder_level: number;
  in_stock: number;
}

export default function PharmacistDashboard() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMedicines() {
      try {
        setLoading(true);
        setError(null);

        const data = await pharmacyApi.medicines();
        setMedicines(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load pharmacy information."
        );
      } finally {
        setLoading(false);
      }
    }

    loadMedicines();
  }, []);

  const totalMedicines = medicines.length;
  const lowStock = medicines.filter(
    (medicine) => medicine.in_stock <= medicine.reorder_level
  ).length;
  const outOfStock = medicines.filter(
    (medicine) => medicine.in_stock <= 0
  ).length;
  const totalUnits = medicines.reduce(
    (sum, medicine) => sum + medicine.in_stock,
    0
  );

  return (
    <div>
      <div>
        <p className="text-sm font-medium text-teal-700">
          Pharmacy Overview
        </p>

        <h1 className="mt-1 text-2xl font-semibold text-teal-950">
          Pharmacy Dashboard
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Monitor medicine inventory and pharmacy activity.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading pharmacy information...
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total Medicines</p>
              <p className="mt-2 text-3xl font-semibold text-teal-950">
                {totalMedicines}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total Units in Stock</p>
              <p className="mt-2 text-3xl font-semibold text-teal-950">
                {totalUnits}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Low Stock</p>
              <p className="mt-2 text-3xl font-semibold text-amber-600">
                {lowStock}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Out of Stock</p>
              <p className="mt-2 text-3xl font-semibold text-red-600">
                {outOfStock}
              </p>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-teal-950">
                Inventory Status
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current medicine stock and reorder warnings.
              </p>
            </div>

            {medicines.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                No medicines found in the pharmacy inventory.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Medicine</th>
                      <th className="px-5 py-3 font-medium">Category</th>
                      <th className="px-5 py-3 font-medium">Unit Price</th>
                      <th className="px-5 py-3 font-medium">Stock</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {medicines.map((medicine) => {
                      const isOutOfStock = medicine.in_stock <= 0;
                      const isLowStock =
                        medicine.in_stock <= medicine.reorder_level;

                      return (
                        <tr
                          key={medicine.id}
                          className="border-t border-slate-100"
                        >
                          <td className="px-5 py-3 font-medium text-slate-800">
                            {medicine.name}
                          </td>

                          <td className="px-5 py-3 text-slate-600">
                            {medicine.category || "—"}
                          </td>

                          <td className="px-5 py-3 text-slate-600">
                            Rs. {Number(medicine.unit_price).toFixed(2)}
                          </td>

                          <td className="px-5 py-3 text-slate-600">
                            {medicine.in_stock}
                          </td>

                          <td className="px-5 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                isOutOfStock
                                  ? "bg-red-50 text-red-700"
                                  : isLowStock
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-teal-50 text-teal-800"
                              }`}
                            >
                              {isOutOfStock
                                ? "Out of stock"
                                : isLowStock
                                  ? "Low stock"
                                  : "In stock"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}