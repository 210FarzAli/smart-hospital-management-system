import { FormEvent, useEffect, useMemo, useState } from "react";
import { departmentsApi, doctorsApi } from "../../lib/apiClient";
import type { Department, Doctor } from "../../lib/types";
import {
  Stethoscope,
  Plus,
  Search,
  Edit,
  User,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  ShieldCheck,
  X,
} from "../../components/icons/Icons";

const emptyForm = {
  full_name: "",
  department_id: "",
  specialization: "",
  qualification: "",
  experience_years: 0,
  consultation_fee: 0,
  description: "",
};

type DoctorFilter = "all" | "active" | "inactive";

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filter, setFilter] = useState<DoctorFilter>("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDoctors() {
    try {
      setLoadingDoctors(true);
      setError(null);
      const data = await doctorsApi.adminList();
      setDoctors(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to load doctors list."
      );
    } finally {
      setLoadingDoctors(false);
    }
  }

  useEffect(() => {
    loadDoctors();
    departmentsApi
      .list()
      .then(setDepartments)
      .catch(console.error);
  }, []);

  const filteredDoctors = useMemo(() => {
    let result = [...doctors];

    if (filter === "active") {
      result = result.filter((d) => d.status === "active");
    } else if (filter === "inactive") {
      result = result.filter((d) => d.status === "inactive");
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (d) =>
          d.full_name?.toLowerCase().includes(q) ||
          d.specialization?.toLowerCase().includes(q) ||
          d.department_name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [doctors, filter, search]);

  const activeCount = doctors.filter((d) => d.status === "active").length;
  const inactiveCount = doctors.filter((d) => d.status === "inactive").length;

  function resetForm() {
    setForm(emptyForm);
    setEditingDoctor(null);
    setShowForm(false);
    setError(null);
  }

  function openAddForm() {
    setEditingDoctor(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEditForm(doctor: Doctor) {
    setEditingDoctor(doctor);
    setForm({
      full_name: doctor.full_name || "",
      department_id: doctor.department_id || "",
      specialization: doctor.specialization || "",
      qualification: doctor.qualification || "",
      experience_years: doctor.experience_years || 0,
      consultation_fee: doctor.consultation_fee || 0,
      description: doctor.description || "",
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingDoctor) {
        await doctorsApi.update(editingDoctor.id, form);
      } else {
        await doctorsApi.create(form);
      }
      await loadDoctors();
      resetForm();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : editingDoctor
          ? "Failed to update doctor."
          : "Failed to create doctor profile."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(doctor: Doctor) {
    const isActive = doctor.status === "active";
    const confirmed = window.confirm(
      isActive
        ? `Deactivate ${doctor.full_name}?\n\nThis doctor will be hidden from public OPD booking, but past records remain safe.`
        : `Re-activate ${doctor.full_name}?`
    );

    if (!confirmed) return;

    setActionLoading(doctor.id);
    setError(null);

    try {
      await doctorsApi.update(doctor.id, {
        status: isActive ? "inactive" : "active",
      });
      await loadDoctors();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to change doctor status."
      );
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Medical Staff Registry
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Doctors Directory ({doctors.length})
          </h1>
          <p className="text-xs text-slate-500">
            Configure physician profiles, departmental credentials, consultation fees, and active status.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="btn-primary inline-flex items-center gap-2 text-xs shadow-md shadow-teal-900/10"
        >
          <Plus className="h-4 w-4" />
          Add New Physician
        </button>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`card flex items-center justify-between p-4 text-left transition-all ${
            filter === "all"
              ? "ring-2 ring-teal-600 bg-teal-50/40"
              : "hover:bg-slate-50/60"
          }`}
        >
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">
              Total Physicians
            </div>
            <div className="mt-1 text-2xl font-extrabold text-teal-950">
              {doctors.length}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100/60 text-teal-800">
            <Stethoscope className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("active")}
          className={`card flex items-center justify-between p-4 text-left transition-all ${
            filter === "active"
              ? "ring-2 ring-emerald-600 bg-emerald-50/40"
              : "hover:bg-slate-50/60"
          }`}
        >
          <div>
            <div className="text-xs font-bold text-emerald-800 uppercase">
              Active / On Duty
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
          onClick={() => setFilter("inactive")}
          className={`card flex items-center justify-between p-4 text-left transition-all ${
            filter === "inactive"
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
            <User className="h-5 w-5" />
          </div>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search physician by name, specialty, or department..."
            className="input-field pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as DoctorFilter)}
            className="input-field py-1.5 text-xs w-auto"
          >
            <option value="all">All Doctors ({doctors.length})</option>
            <option value="active">Active Only ({activeCount})</option>
            <option value="inactive">Deactivated Only ({inactiveCount})</option>
          </select>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-800 ring-1 ring-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Add / Edit Form Modal / Slide-in */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-teal-950">
                  {editingDoctor ? "Edit Physician Profile" : "Register New Physician"}
                </h3>
                <p className="text-xs text-slate-500">
                  Fill in credentials and OPD consultation details.
                </p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="e.g. Dr. Ayesha Siddiqa"
                    className="input-field mt-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={form.department_id}
                    onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                    className="input-field mt-1.5 text-xs"
                  >
                    <option value="">Select Clinical Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                    Specialization <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.specialization}
                    onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                    placeholder="e.g. Interventional Cardiology"
                    className="input-field mt-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                    Qualifications
                  </label>
                  <input
                    type="text"
                    value={form.qualification}
                    onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                    placeholder="e.g. MBBS, FCPS (Cardiology)"
                    className="input-field mt-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                    Experience (Years)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={form.experience_years}
                    onChange={(e) =>
                      setForm({ ...form, experience_years: Number(e.target.value) })
                    }
                    className="input-field mt-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                    Consultation Fee (PKR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={form.consultation_fee}
                    onChange={(e) =>
                      setForm({ ...form, consultation_fee: Number(e.target.value) })
                    }
                    placeholder="e.g. 2500"
                    className="input-field mt-1.5 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                  Professional Biography / Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Clinical interests, fellowships, and consultation approach..."
                  className="input-field mt-1.5 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetForm}
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
                    ? "Saving Profile..."
                    : editingDoctor
                    ? "Update Doctor"
                    : "Create Doctor Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctors Data Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Doctor & Specialty</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Experience</th>
                <th className="px-5 py-3.5">OPD Fee</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingDoctors ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
                    <p className="mt-2">Loading physicians directory...</p>
                  </td>
                </tr>
              ) : filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No physicians found matching the search criteria.
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doc) => {
                  const isActive = doc.status === "active";
                  return (
                    <tr
                      key={doc.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 font-bold text-teal-900">
                            {doc.full_name
                              ? doc.full_name
                                  .replace(/^Dr\.\s*/i, "")
                                  .slice(0, 2)
                                  .toUpperCase()
                              : "DR"}
                          </div>
                          <div>
                            <div className="font-bold text-teal-950">
                              {doc.full_name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {doc.qualification || doc.specialization}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                          {doc.department_name || "General"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {doc.experience_years ? `${doc.experience_years} years` : "—"}
                      </td>

                      <td className="px-5 py-4 font-semibold text-teal-950">
                        Rs. {Number(doc.consultation_fee || 0).toLocaleString()}
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
                          {isActive ? "Active" : "Deactivated"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(doc)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:border-teal-300 hover:text-teal-950"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(doc)}
                            disabled={actionLoading === doc.id}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                              isActive
                                ? "text-rose-600 hover:bg-rose-50"
                                : "text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {actionLoading === doc.id
                              ? "Updating..."
                              : isActive
                              ? "Deactivate"
                              : "Activate"}
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