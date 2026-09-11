import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { pharmacyApi } from "../../lib/apiClient";
import {
  Pill,
  AlertTriangle,
  CheckCircle,
  Plus,
  ShieldCheck,
  TrendingUp,
  Search,
  ArrowRight,
} from "../../components/icons/Icons";

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
    (m) => m.in_stock <= m.reorder_level && m.in_stock > 0
  ).length;
  const outOfStock = medicines.filter((m) => m.in_stock <= 0).length;
  const totalUnits = medicines.reduce((sum, m) => sum + m.in_stock, 0);

  const attentionMedicines = medicines
    .filter((m) => m.in_stock <= m.reorder_level)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Hospital Dispensary Overview
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Pharmacy Command Center
          </h1>
          <p className="text-xs text-slate-500">
            Real-time stock audit, critical inventory replenishment triggers, and dispensing shortcuts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/pharmacy/new-sale"
            className="btn-primary inline-flex items-center gap-2 text-xs shadow-md shadow-teal-900/10"
          >
            <Plus className="h-4 w-4" />
            New POS Checkout
          </Link>
          <Link
            to="/pharmacy/medicines"
            className="btn-outline inline-flex items-center gap-2 text-xs"
          >
            <Pill className="h-3.5 w-3.5" />
            Full Stock Catalog
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">
              Total Catalog SKUs
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
              <Pill className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-teal-950">
            {loading ? "—" : totalMedicines}
          </div>
          <p className="mt-1 text-xs text-slate-500">Registered medicines</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">
              Units on Shelf
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-800">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-teal-950">
            {loading ? "—" : totalUnits.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-slate-500">Total physical inventory</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase">
              Low Stock Warnings
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-amber-600">
            {loading ? "—" : lowStock}
          </div>
          <p className="mt-1 text-xs text-slate-500">At or below reorder level</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase">
              Out of Stock
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-rose-600">
            {loading ? "—" : outOfStock}
          </div>
          <p className="mt-1 text-xs text-slate-500">Requires urgent PO order</p>
        </div>
      </div>

      {/* Reorder Action Priority List */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-teal-950">
              Urgent Inventory Attention Required
            </h2>
            <p className="text-xs text-slate-500">
              Items currently at zero stock or below safety replenishment thresholds.
            </p>
          </div>

          <Link
            to="/pharmacy/medicines"
            className="text-xs font-semibold text-teal-800 hover:text-teal-950"
          >
            Manage All Stock →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Medicine</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Unit Price</th>
                <th className="px-5 py-3.5">In Stock</th>
                <th className="px-5 py-3.5">Reorder Point</th>
                <th className="px-5 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
                    <p className="mt-2">Auditing inventory...</p>
                  </td>
                </tr>
              ) : attentionMedicines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <CheckCircle className="mx-auto h-8 w-8 text-emerald-500" />
                    <p className="mt-2 font-semibold text-teal-950">
                      All inventory levels are healthy
                    </p>
                    <p className="text-xs text-slate-400">
                      No medicines are below their safety reorder point.
                    </p>
                  </td>
                </tr>
              ) : (
                attentionMedicines.map((m) => {
                  const isZero = m.in_stock <= 0;
                  return (
                    <tr
                      key={m.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-teal-950">{m.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {m.id.slice(0, 8)}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                          {m.category || "General"}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-semibold text-teal-950">
                        Rs. {Number(m.unit_price).toLocaleString()}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`font-bold ${
                            isZero ? "text-rose-600" : "text-amber-600"
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
                              : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isZero ? "bg-rose-500" : "bg-amber-500"
                            }`}
                          />
                          {isZero ? "Stock Exhausted" : "Low Stock"}
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