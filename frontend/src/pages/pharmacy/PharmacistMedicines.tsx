import { FormEvent, useEffect, useState } from "react";
import {
  pharmacyApi,
  type PharmacyMedicine,
} from "../../lib/apiClient";
import {
  Pill,
  Search,
  Plus,
  Edit,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  X,
  Clock,
  DollarSign,
} from "../../components/icons/Icons";

type MedicineForm = {
  name: string;
  category: string;
  unit_price: string;
  reorder_level: string;
  batch_no: string;
  quantity: string;
  purchase_date: string;
  expiry_date: string;
};

const emptyForm: MedicineForm = {
  name: "",
  category: "",
  unit_price: "",
  reorder_level: "20",
  batch_no: "",
  quantity: "0",
  purchase_date: new Date().toISOString().slice(0, 10),
  expiry_date: "",
};

export default function PharmacistMedicines() {
  const [medicines, setMedicines] = useState<PharmacyMedicine[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMedicine, setEditingMedicine] =
    useState<PharmacyMedicine | null>(null);
  const [form, setForm] = useState<MedicineForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );

  async function loadMedicines() {
    try {
      setLoading(true);
      setError(null);
      const data = await pharmacyApi.medicines();
      setMedicines(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to load medicines."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMedicines();
  }, []);

  function updateForm(field: keyof MedicineForm, value: string) {
    setForm((curr) => ({ ...curr, [field]: value }));
  }

  function openAddForm() {
    setEditingMedicine(null);
    setForm({
      ...emptyForm,
      purchase_date: new Date().toISOString().slice(0, 10),
    });
    setError(null);
    setShowForm(true);
  }

  function openEditForm(medicine: PharmacyMedicine) {
    setEditingMedicine(medicine);
    setForm({
      name: medicine.name || "",
      category: medicine.category || "",
      unit_price: String(medicine.unit_price ?? 0),
      reorder_level: String(medicine.reorder_level ?? 20),
      batch_no: "",
      quantity: "",
      purchase_date: new Date().toISOString().slice(0, 10),
      expiry_date: "",
    });
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditingMedicine(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingMedicine) {
        await pharmacyApi.updateMedicine(editingMedicine.id, {
          name: form.name.trim(),
          category: form.category.trim() || null,
          unit_price: Number(form.unit_price),
          reorder_level: Number(form.reorder_level),
        });
      } else {
        if (!form.batch_no.trim()) {
          throw new Error("Batch number is required.");
        }
        if (!form.expiry_date) {
          throw new Error("Expiry date is required.");
        }

        await pharmacyApi.createMedicine({
          name: form.name.trim(),
          category: form.category.trim() || null,
          unit_price: Number(form.unit_price),
          reorder_level: Number(form.reorder_level),
          batch_no: form.batch_no.trim(),
          quantity: Number(form.quantity),
          purchase_date: form.purchase_date || null,
          expiry_date: form.expiry_date,
        });
      }

      await loadMedicines();
      closeForm();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : editingMedicine
          ? "Failed to update medicine."
          : "Failed to add medicine."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleMedicineStatus(medicine: PharmacyMedicine) {
    const isActive = medicine.status === "active";
    const confirmed = window.confirm(
      isActive
        ? `Deactivate "${medicine.name}"?\n\nIt will be preserved in historical records but hidden from new POS sales.`
        : `Re-activate "${medicine.name}" for sales?`
    );

    if (!confirmed) return;

    try {
      setError(null);
      await pharmacyApi.updateMedicine(medicine.id, {
        status: isActive ? "inactive" : "active",
      });
      await loadMedicines();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to change medicine status."
      );
    }
  }

  const filteredMedicines = medicines.filter((medicine) => {
    const text = `${medicine.name} ${medicine.category || ""} ${
      medicine.status
    }`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || medicine.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = medicines.filter((m) => m.status === "active").length;
  const inactiveCount = medicines.filter((m) => m.status === "inactive").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Pharmaceutical Master Catalog
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Medicine Stock & Catalog ({medicines.length})
          </h1>
          <p className="text-xs text-slate-500">
            Maintain medicine batches, retail pricing, reorder points, and active inventory status.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="btn-primary inline-flex items-center gap-2 text-xs shadow-md shadow-teal-900/10"
        >
          <Plus className="h-4 w-4" />
          Add New Medicine
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`card flex items-center justify-between p-4 text-left transition-all ${
            statusFilter === "all"
              ? "ring-2 ring-teal-600 bg-teal-50/40"
              : "hover:bg-slate-50/60"
          }`}
        >
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">
              Total Catalog SKUs
            </div>
            <div className="mt-1 text-2xl font-extrabold text-teal-950">
              {medicines.length}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100/60 text-teal-800">
            <Pill className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("active")}
          className={`card flex items-center justify-between p-4 text-left transition-all ${
            statusFilter === "active"
              ? "ring-2 ring-emerald-600 bg-emerald-50/40"
              : "hover:bg-slate-50/60"
          }`}
        >
          <div>
            <div className="text-xs font-bold text-emerald-800 uppercase">
              Active For Dispensing
            </div>
            <div className="mt-1 text-2xl font-extrabold text-emerald-700">
              {activeCount}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100/60 text-emerald-800">
            <CheckCircle className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("inactive")}
          className={`card flex items-center justify-between p-4 text-left transition-all ${
            statusFilter === "inactive"
              ? "ring-2 ring-slate-400 bg-slate-100"
              : "hover:bg-slate-50/60"
          }`}
        >
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">
              Deactivated
            </div>
            <div className="mt-1 text-2xl font-extrabold text-slate-600">
              {inactiveCount}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicine brand or generic category..."
            className="input-field pl-9 text-xs"
          />
        </div>
      </div>

      {/* Error alert */}
      {error && !showForm && (
        <div className="rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-teal-950">
                  {editingMedicine ? "Edit Medicine Details" : "Register Medicine & Stock Batch"}
                </h3>
                <p className="text-xs text-slate-500">
                  Update pricing, safety stock levels, and procurement records.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                    Medicine Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    placeholder="e.g. Augmentin 625mg"
                    className="input-field mt-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                    Therapeutic Category
                  </label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => updateForm("category", e.target.value)}
                    placeholder="e.g. Antibiotics, Analgesics"
                    className="input-field mt-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                    Unit Retail Price (PKR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.unit_price}
                    onChange={(e) => updateForm("unit_price", e.target.value)}
                    placeholder="e.g. 350"
                    className="input-field mt-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                    Reorder Alert Level (Units) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.reorder_level}
                    onChange={(e) => updateForm("reorder_level", e.target.value)}
                    placeholder="20"
                    className="input-field mt-1.5 text-xs"
                  />
                </div>

                {/* Batch and Quantity only on Add */}
                {!editingMedicine && (
                  <>
                    <div>
                      <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                        Initial Batch No. <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.batch_no}
                        onChange={(e) => updateForm("batch_no", e.target.value)}
                        placeholder="e.g. BT-98124"
                        className="input-field mt-1.5 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                        Opening Quantity <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={form.quantity}
                        onChange={(e) => updateForm("quantity", e.target.value)}
                        placeholder="e.g. 100"
                        className="input-field mt-1.5 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                        Procurement Date
                      </label>
                      <input
                        type="date"
                        value={form.purchase_date}
                        onChange={(e) =>
                          updateForm("purchase_date", e.target.value)
                        }
                        className="input-field mt-1.5 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                        Expiry Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={form.expiry_date}
                        onChange={(e) => updateForm("expiry_date", e.target.value)}
                        className="input-field mt-1.5 text-xs"
                      />
                    </div>
                  </>
                )}
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 ring-1 ring-rose-200">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeForm}
                  className="btn-outline text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-xs"
                >
                  {saving
                    ? "Saving..."
                    : editingMedicine
                    ? "Update Medicine"
                    : "Add to Inventory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Medicines Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Medicine Name</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Unit Price</th>
                <th className="px-5 py-3.5">In Stock</th>
                <th className="px-5 py-3.5">Reorder Level</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
                    <p className="mt-2">Loading medicine inventory...</p>
                  </td>
                </tr>
              ) : filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No medicines found.
                  </td>
                </tr>
              ) : (
                filteredMedicines.map((m) => {
                  const isActive = m.status === "active";
                  const isLow = m.in_stock <= m.reorder_level;
                  const isZero = m.in_stock <= 0;

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
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
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

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            isActive
                              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(m)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:border-teal-300 hover:text-teal-950"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleMedicineStatus(m)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                              isActive
                                ? "text-rose-600 hover:bg-rose-50"
                                : "text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
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