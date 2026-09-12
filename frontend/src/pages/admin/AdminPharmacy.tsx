import { useEffect, useMemo, useState } from "react";
import { pharmacyApi } from "../../lib/apiClient";
import {
  Pill,
  Search,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  TrendingUp,
} from "../../components/icons/Icons";

interface MedicineRow {
  id: string;
  name: string;
  category: string | null;
  unit_price: number;
  reorder_level: number;
  in_stock: number;
}

export default function AdminPharmacy() {
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    pharmacyApi
      .medicines()
      .then((res) => {
        setMedicines(res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    medicines.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [medicines]);

  const filteredMedicines = useMemo(() => {
    let result = [...medicines];

    if (categoryFilter !== "all") {
      result = result.filter((m) => m.category === categoryFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.category?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [medicines, categoryFilter, search]);

  const lowStockCount = medicines.filter(
    (m) => m.in_stock <= m.reorder_level
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Pharmaceutical Stock Control
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Pharmacy Inventory ({medicines.length})
          </h1>
          <p className="text-xs text-slate-500">
            Real-time tracking of medicine quantities, unit retail pricing, and threshold alerts.
          </p>
        </div>

        {lowStockCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-800 ring-1 ring-rose-200">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span>{lowStockCount} Medicines Need Reordering</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-xs font-bold text-slate-500 uppercase">
            Total Catalog SKUs
          </div>
          <div className="mt-2 text-3xl font-extrabold text-teal-950">
            {medicines.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Active pharmaceutical items
          </div>
        </div>

        <div className="card p-5">
          <div className="text-xs font-bold text-emerald-800 uppercase">
            In Stock
          </div>
          <div className="mt-2 text-3xl font-extrabold text-emerald-700">
            {medicines.length - lowStockCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Above reorder threshold
          </div>
        </div>

        <div className="card p-5">
          <div className="text-xs font-bold text-rose-800 uppercase">
            Low Stock Warnings
          </div>
          <div className="mt-2 text-3xl font-extrabold text-rose-600">
            {lowStockCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            At or below reorder level
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicine brand or generic name..."
            className="input-field pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Category:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field py-1.5 text-xs w-auto"
          >
            <option value="all">All Categories ({medicines.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Medicine Name</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Unit Price</th>
                <th className="px-5 py-3.5">Stock Level</th>
                <th className="px-5 py-3.5">Reorder Level</th>
                <th className="px-5 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
                    <p className="mt-2">Loading medicine inventory...</p>
                  </td>
                </tr>
              ) : filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No medicines found.
                  </td>
                </tr>
              ) : (
                filteredMedicines.map((m) => {
                  const isLow = m.in_stock <= m.reorder_level;
                  const isZero = m.in_stock === 0;

                  return (
                    <tr
                      key={m.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
                            <Pill className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-bold text-teal-950">
                              {m.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              SKU: {m.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                          {m.category || "General"}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-semibold text-teal-950">
                        Rs. {Number(m.unit_price).toLocaleString()}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`font-bold ${
                            isZero
                              ? "text-rose-600"
                              : isLow
                              ? "text-amber-600"
                              : "text-slate-800"
                          }`}
                        >
                          {m.in_stock} units
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {m.reorder_level} units
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            isZero
                              ? "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
                              : isLow
                              ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                              : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isZero
                                ? "bg-rose-500"
                                : isLow
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                          />
                          {isZero
                            ? "Out of Stock"
                            : isLow
                            ? "Low Stock"
                            : "In Stock"}
                        </span>
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
