import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  pharmacyApi,
  type PharmacyMedicine,
} from "../../lib/apiClient";

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
  purchase_date: new Date()
    .toISOString()
    .slice(0, 10),
  expiry_date: "",
};

export default function PharmacistMedicines() {
  const [medicines, setMedicines] = useState<
    PharmacyMedicine[]
  >([]);

  const [showForm, setShowForm] =
    useState(false);

  const [editingMedicine, setEditingMedicine] =
    useState<PharmacyMedicine | null>(null);

  const [form, setForm] =
    useState<MedicineForm>(emptyForm);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
  useState<"all" | "active" | "inactive">("all");  

  async function loadMedicines() {
    try {
      setLoading(true);
      setError(null);

      const data =
        await pharmacyApi.medicines();

      setMedicines(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load medicines."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMedicines();
  }, []);

  function updateForm(
    field: keyof MedicineForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openAddForm() {
    setEditingMedicine(null);

    setForm({
      ...emptyForm,
      purchase_date: new Date()
        .toISOString()
        .slice(0, 10),
    });

    setError(null);
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openEditForm(
    medicine: PharmacyMedicine
  ) {
    setEditingMedicine(medicine);

    setForm({
      name: medicine.name || "",
      category: medicine.category || "",
      unit_price: String(
        medicine.unit_price ?? 0
      ),
      reorder_level: String(
        medicine.reorder_level ?? 20
      ),
      batch_no: "",
      quantity: "",
      purchase_date: new Date()
        .toISOString()
        .slice(0, 10),
      expiry_date: "",
    });

    setError(null);
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingMedicine(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(
    e: FormEvent
  ) {
    e.preventDefault();

    setSaving(true);
    setError(null);

    try {
      if (editingMedicine) {
        await pharmacyApi.updateMedicine(
          editingMedicine.id,
          {
            name: form.name.trim(),
            category:
              form.category.trim() || null,
            unit_price: Number(
              form.unit_price
            ),
            reorder_level: Number(
              form.reorder_level
            ),
          }
        );
      } else {
        if (!form.batch_no.trim()) {
          throw new Error(
            "Batch number is required."
          );
        }

        if (!form.expiry_date) {
          throw new Error(
            "Expiry date is required."
          );
        }

        await pharmacyApi.createMedicine({
          name: form.name.trim(),
          category:
            form.category.trim() || null,
          unit_price: Number(
            form.unit_price
          ),
          reorder_level: Number(
            form.reorder_level
          ),
          batch_no:
            form.batch_no.trim(),
          quantity: Number(
            form.quantity
          ),
          purchase_date:
            form.purchase_date || null,
          expiry_date:
            form.expiry_date,
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

  // ============================================================
  // ACTIVATE / DEACTIVATE
  // ============================================================

  async function toggleMedicineStatus(
    medicine: PharmacyMedicine
  ) {
    const isActive =
      medicine.status === "active";

    const action = isActive
      ? "deactivate"
      : "activate";

    const confirmed = window.confirm(
      isActive
        ? `Are you sure you want to delete "${medicine.name}"?\n\nThe medicine will be deactivated and kept in the system and sales history. It will no longer be available for new sales.`
        : `Are you sure you want to activate "${medicine.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);

      await pharmacyApi.updateMedicine(
        medicine.id,
        {
          status: isActive
            ? "inactive"
            : "active",
        }
      );

      await loadMedicines();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${action} medicine.`
      );
    }
  }

  const filteredMedicines =
  medicines.filter((medicine) => {
    const text =
      `${medicine.name} ${
        medicine.category || ""
      } ${medicine.status}`.toLowerCase();

    const matchesSearch =
      text.includes(
        search.toLowerCase()
      );

    const matchesStatus =
      statusFilter === "all" ||
      medicine.status === statusFilter;

    return (
      matchesSearch &&
      matchesStatus
    );
  });

  const lowStockCount =
    medicines.filter(
      (medicine) =>
        medicine.status === "active" &&
        medicine.in_stock <=
          medicine.reorder_level
    ).length;

  const activeCount =
    medicines.filter(
      (medicine) =>
        medicine.status === "active"
    ).length;

  const inactiveCount =
    medicines.filter(
      (medicine) =>
        medicine.status === "inactive"
    ).length;

  return (
    <div className="space-y-6">
      {/* ====================================================== */}
      {/* PAGE HEADER */}
      {/* ====================================================== */}

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-teal-700">
            Pharmacy Inventory
          </p>

          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Medicines / Stock
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage medicines, prices, stock and
            availability.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={loadMedicines}
            disabled={loading}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-900"
          >
            + Add New Medicine
          </button>
        </div>
      </div>

      {/* ====================================================== */}
      {/* ADD / EDIT FORM */}
      {/* ====================================================== */}

      {showForm && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingMedicine
                    ? "Edit Medicine"
                    : "Add New Medicine"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingMedicine
                    ? "Update the medicine's basic information."
                    : "Create a medicine and its initial stock batch."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-md px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 p-6"
          >
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* ------------------------------------------------ */}
            {/* MEDICINE INFORMATION */}
            {/* ------------------------------------------------ */}

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Medicine Information
              </h3>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Medicine Name *
                  </label>

                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      updateForm(
                        "name",
                        e.target.value
                      )
                    }
                    placeholder="e.g. Amlodipine 5mg"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Category
                  </label>

                  <input
                    value={form.category}
                    onChange={(e) =>
                      updateForm(
                        "category",
                        e.target.value
                      )
                    }
                    placeholder="e.g. Antihypertensive"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Unit Price (Rs.) *
                  </label>

                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.unit_price}
                    onChange={(e) =>
                      updateForm(
                        "unit_price",
                        e.target.value
                      )
                    }
                    placeholder="0.00"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Reorder Level *
                  </label>

                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={form.reorder_level}
                    onChange={(e) =>
                      updateForm(
                        "reorder_level",
                        e.target.value
                      )
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                </div>
              </div>
            </div>

            {/* ------------------------------------------------ */}
            {/* INITIAL STOCK */}
            {/* ------------------------------------------------ */}

            {!editingMedicine && (
              <div className="border-t border-slate-200 pt-6">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Initial Stock Batch
                </h3>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Batch Number *
                    </label>

                    <input
                      required
                      value={form.batch_no}
                      onChange={(e) =>
                        updateForm(
                          "batch_no",
                          e.target.value
                        )
                      }
                      placeholder="e.g. BATCH-001"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Initial Stock Quantity *
                    </label>

                    <input
                      required
                      type="number"
                      min="0"
                      step="1"
                      value={form.quantity}
                      onChange={(e) =>
                        updateForm(
                          "quantity",
                          e.target.value
                        )
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Purchase Date
                    </label>

                    <input
                      type="date"
                      value={
                        form.purchase_date
                      }
                      onChange={(e) =>
                        updateForm(
                          "purchase_date",
                          e.target.value
                        )
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Expiry Date *
                    </label>

                    <input
                      required
                      type="date"
                      value={
                        form.expiry_date
                      }
                      onChange={(e) =>
                        updateForm(
                          "expiry_date",
                          e.target.value
                        )
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  The initial quantity will be
                  stored as the first stock batch
                  for this medicine.
                </div>
              </div>
            )}

            {/* ------------------------------------------------ */}
            {/* EDIT NOTE */}
            {/* ------------------------------------------------ */}

            {editingMedicine && (
              <div className="border-t border-slate-200 pt-6">
                <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Current stock and existing batch
                  information are not changed when
                  editing the medicine.
                </div>
              </div>
            )}

            {/* ------------------------------------------------ */}
            {/* FORM BUTTONS */}
            {/* ------------------------------------------------ */}

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-md border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-teal-800 px-5 py-2 text-sm font-medium text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingMedicine
                    ? "Update Medicine"
                    : "Add Medicine"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ====================================================== */}
      {/* SUMMARY CARDS */}
      {/* ====================================================== */}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total Medicines
          </p>

          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {medicines.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Active
          </p>

          <p className="mt-1 text-2xl font-semibold text-emerald-600">
            {activeCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
  Deactivated
</p>

          <p className="mt-1 text-2xl font-semibold text-slate-500">
            {inactiveCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Low Stock
          </p>

          <p className="mt-1 text-2xl font-semibold text-amber-600">
            {lowStockCount}
          </p>
        </div>
      </div>

      {/* ====================================================== */}
      {/* INVENTORY */}
      {/* ====================================================== */}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Medicine Inventory
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {medicines.length} medicines in
              the inventory.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
  <button
    type="button"
    onClick={() =>
      setStatusFilter("all")
    }
    className={`rounded-md px-4 py-2 text-sm font-medium ${
      statusFilter === "all"
        ? "bg-teal-800 text-white"
        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
    }`}
  >
    All
  </button>

  <button
    type="button"
    onClick={() =>
      setStatusFilter("active")
    }
    className={`rounded-md px-4 py-2 text-sm font-medium ${
      statusFilter === "active"
        ? "bg-teal-800 text-white"
        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
    }`}
  >
    Active
  </button>

  <button
    type="button"
    onClick={() =>
      setStatusFilter("inactive")
    }
    className={`rounded-md px-4 py-2 text-sm font-medium ${
      statusFilter === "inactive"
        ? "bg-teal-800 text-white"
        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
    }`}
  >
    Deactivated
  </button>
</div>

          <div className="w-full md:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search medicine..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            />
          </div>
        </div>

        {error && !showForm && (
          <div className="border-b border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Loading medicines...
          </div>
        ) : filteredMedicines.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              No medicines found.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Try another search or add a new
              medicine.
            </p>
          </div>
        ) : (
          <>
            {/* ================================================= */}
            {/* DESKTOP TABLE */}
            {/* ================================================= */}

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Medicine
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Category
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Unit Price
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Reorder Level
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      In Stock
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMedicines.map(
                    (medicine) => {
                      const isActive =
                        medicine.status ===
                        "active";

                      const lowStock =
                        isActive &&
                        medicine.in_stock <=
                          medicine.reorder_level;

                      return (
                        <tr
                          key={medicine.id}
                          className={`border-b border-slate-100 last:border-0 ${
                            isActive
                              ? "hover:bg-slate-50"
                              : "bg-slate-50/70"
                          }`}
                        >
                          <td className="px-5 py-4">
                            <div
                              className={`font-medium ${
                                isActive
                                  ? "text-slate-900"
                                  : "text-slate-500"
                              }`}
                            >
                              {medicine.name}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {medicine.category ||
                              "—"}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            Rs.{" "}
                            {Number(
                              medicine.unit_price
                            ).toFixed(2)}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {
                              medicine.reorder_level
                            }
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                            {medicine.in_stock}
                          </td>

                          <td className="px-5 py-4">
                            {isActive ? (
                              lowStock ? (
                                <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                                  Low Stock
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                                  Active
                                </span>
                              )
                            ) : (
                              <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                                Inactive
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              {/* EDIT */}

                              <button
                                type="button"
                                onClick={() =>
                                  openEditForm(
                                    medicine
                                  )
                                }
                                className="rounded-md border border-teal-200 bg-white px-3 py-1.5 text-sm font-medium text-teal-800 hover:bg-teal-50"
                              >
                                Edit
                              </button>

                              {/* ACTIVATE / DEACTIVATE */}

                              <button
                                type="button"
                                onClick={() =>
                                  toggleMedicineStatus(
                                    medicine
                                  )
                                }
                                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                                  isActive
                                    ? "border border-red-200 bg-white text-red-700 hover:bg-red-50"
                                    : "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                                }`}
                              >
                                {isActive
  ? "Delete"
  : "Activate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            {/* ================================================= */}
            {/* MOBILE CARDS */}
            {/* ================================================= */}

            <div className="divide-y divide-slate-100 md:hidden">
              {filteredMedicines.map(
                (medicine) => {
                  const isActive =
                    medicine.status ===
                    "active";

                  const lowStock =
                    isActive &&
                    medicine.in_stock <=
                      medicine.reorder_level;

                  return (
                    <div
                      key={medicine.id}
                      className={`space-y-4 p-5 ${
                        !isActive
                          ? "bg-slate-50/70"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3
                            className={`font-semibold ${
                              isActive
                                ? "text-slate-900"
                                : "text-slate-500"
                            }`}
                          >
                            {medicine.name}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {medicine.category ||
                              "No category"}
                          </p>
                        </div>

                        {isActive ? (
                          lowStock ? (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                              Low Stock
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                              Active
                            </span>
                          )
                        ) : (
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">
                            Unit Price
                          </p>

                          <p className="mt-1 font-medium text-slate-900">
                            Rs.{" "}
                            {Number(
                              medicine.unit_price
                            ).toFixed(2)}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500">
                            In Stock
                          </p>

                          <p className="mt-1 font-medium text-slate-900">
                            {
                              medicine.in_stock
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500">
                            Reorder Level
                          </p>

                          <p className="mt-1 font-medium text-slate-900">
                            {
                              medicine.reorder_level
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEditForm(
                              medicine
                            )
                          }
                          className="flex-1 rounded-md border border-teal-200 bg-white px-4 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleMedicineStatus(
                              medicine
                            )
                          }
                          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${
                            isActive
                              ? "border border-red-200 bg-white text-red-700 hover:bg-red-50"
                              : "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {isActive
                            ? "Deactivate"
                            : "Activate"}
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
} 