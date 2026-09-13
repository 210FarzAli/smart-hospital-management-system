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
  Mail,
  Building,
} from "../../components/icons/Icons";

const emptyForm = {
  full_name: "",
  department_id: "",
  specialization: "",
  qualification: "",
  experience_years: 0,
  consultation_fee: 1500,
  description: "",
  email: "",
  password: "",
  phone: "",
};

type DoctorFilter = "all" | "active" | "inactive";

export default function HRDoctors() {
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

  const activeCount = useMemo(
    () => doctors.filter((d) => d.status === "active").length,
    [doctors]
  );
  const inactiveCount = doctors.length - activeCount;

  function resetForm() {
    setEditingDoctor(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(false);
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
      consultation_fee: doctor.consultation_fee || 1500,
      description: doctor.description || "",
      email: "",
      password: "",
      phone: "",
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
        await doctorsApi.update(editingDoctor.id, {
          full_name: form.full_name.trim(),
          department_id: form.department_id,
          specialization: form.specialization.trim(),
          qualification: form.qualification.trim() || null,
          experience_years: Number(form.experience_years) || 0,
          consultation_fee: Number(form.consultation_fee) || 0,
          description: form.description.trim() || null,
        });
      } else {
        await doctorsApi.create({
          full_name: form.full_name.trim(),
          department_id: form.department_id,
          specialization: form.specialization.trim(),
          qualification: form.qualification.trim() || null,
          experience_years: Number(form.experience_years) || 0,
          consultation_fee: Number(form.consultation_fee) || 0,
          description: form.description.trim() || null,
          email: form.email.trim() || undefined,
          password: form.password || undefined,
          phone: form.phone.trim() || undefined,
          availability: [
            { day_of_week: "monday", start_time: "09:00", end_time: "14:00", is_active: true },
            { day_of_week: "tuesday", start_time: "09:00", end_time: "14:00", is_active: true },
            { day_of_week: "wednesday", start_time: "09:00", end_time: "14:00", is_active: true },
            { day_of_week: "thursday", start_time: "09:00", end_time: "14:00", is_active: true },
            { day_of_week: "friday", start_time: "09:00", end_time: "13:00", is_active: true },
          ],
        } as any);
      }
      await loadDoctors();
      resetForm();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : editingDoctor
          ? "Failed to update doctor profile."
          : "Failed to create doctor employment record."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(doctor: Doctor) {
    const isActive = doctor.status === "active";
    const confirmed = window.confirm(
      isActive
        ? `Deactivate Dr. ${doctor.full_name}?

This physician will be paused from public appointments and OPD scheduling.`
        : `Re-activate Dr. ${doctor.full_name} for clinical appointments?`
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
            Human Resources &bull; Medical Staff Management
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Doctors & Clinical Specialists ({doctors.length})
          </h1>
          <p className="text-xs text-slate-500">
            HR oversight for clinical onboarding, credentials, OPD shifts, and doctor account provisioning.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="btn-primary inline-flex items-center gap-2 text-xs shadow-md shadow-teal-900/10"
        >
          <Plus className="h-4 w-4" />
          Onboard New Physician
        </button>
      </div>

      {/* KPI Stats */}
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
              Active / In Service
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
              Deactivated / On Leave
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

      {/* Search Toolbar */}
      <div className="card flex items-center justify-between p-4">
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
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="ml-3 text-xs font-semibold text-teal-800 hover:text-teal-950"
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-800 ring-1 ring-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <th className="px-5 py-3.5">Physician</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Experience</th>
                <th className="px-5 py-3.5">OPD Fee</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">HR Actions</th>
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
                                  .replace(/^Dr.s*/i, "")
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

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-teal-950">
                  {editingDoctor ? "Edit Physician Employment Profile" : "Onboard New Physician (HR Suite)"}
                </h3>
                <p className="text-xs text-slate-500">
                  Manage physician credentials, department assignment, OPD consultation fees, and login access.
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
                    placeholder="e.g. Dr. Ayesha Malik"
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
                    className="input-field mt-1.5 text-xs"
                  />
                </div>
              </div>

              {!editingDoctor && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="text-xs font-bold text-teal-950 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-teal-700" />
                    Doctor Staff Portal Login Credentials (Optional)
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600">Doctor Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="doctor@hospital.local"
                        className="input-field mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600">Password</label>
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="••••••••"
                        className="input-field mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600">Contact Phone</label>
                      <input
                        type="text"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="03001234567"
                        className="input-field mt-1 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                  Physician Bio & Background
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Professional background, awards, and clinical focus areas..."
                  className="input-field mt-1.5 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-xs px-5 py-2"
                >
                  {saving ? "Saving..." : editingDoctor ? "Save Changes" : "Create Physician"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
