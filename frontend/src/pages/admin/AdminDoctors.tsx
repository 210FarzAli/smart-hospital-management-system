import { FormEvent, useEffect, useMemo, useState } from "react";
import { departmentsApi, doctorsApi } from "../../lib/apiClient";
import type { Department, Doctor } from "../../lib/types";

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

  const [filter, setFilter] =
    useState<DoctorFilter>("all");

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] =
    useState<Doctor | null>(null);

  const [form, setForm] = useState(emptyForm);

  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const [loadingDoctors, setLoadingDoctors] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  // ============================================================
  // LOAD ALL DOCTORS
  // ============================================================
  async function loadDoctors() {
    try {
      setLoadingDoctors(true);
      setError(null);

      const data = await doctorsApi.adminList();

      setDoctors(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load doctors."
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
      .catch((err) => {
        console.error(err);
      });
  }, []);

  // ============================================================
  // FILTER DOCTORS
  // ============================================================
  const filteredDoctors = useMemo(() => {
    let result = [...doctors];

    if (filter === "active") {
      result = result.filter(
        (doctor) =>
          doctor.status === "active"
      );
    }

    if (filter === "inactive") {
      result = result.filter(
        (doctor) =>
          doctor.status === "inactive"
      );
    }

    const searchValue =
      search.trim().toLowerCase();

    if (searchValue) {
      result = result.filter((doctor) => {
        return (
          doctor.full_name
            ?.toLowerCase()
            .includes(searchValue) ||
          doctor.specialization
            ?.toLowerCase()
            .includes(searchValue) ||
          doctor.department_name
            ?.toLowerCase()
            .includes(searchValue)
        );
      });
    }

    return result;
  }, [doctors, filter, search]);

  // ============================================================
  // COUNTS
  // ============================================================
  const activeCount = doctors.filter(
    (doctor) =>
      doctor.status === "active"
  ).length;

  const inactiveCount = doctors.filter(
    (doctor) =>
      doctor.status === "inactive"
  ).length;

  // ============================================================
  // FORM
  // ============================================================
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

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openEditForm(
    doctor: Doctor
  ) {
    setEditingDoctor(doctor);

    setForm({
      full_name:
        doctor.full_name || "",
      department_id:
        doctor.department_id || "",
      specialization:
        doctor.specialization || "",
      qualification:
        doctor.qualification || "",
      experience_years:
        doctor.experience_years || 0,
      consultation_fee:
        doctor.consultation_fee || 0,
      description:
        doctor.description || "",
    });

    setError(null);
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // ============================================================
  // ADD / EDIT DOCTOR
  // ============================================================
  async function handleSubmit(
    e: FormEvent
  ) {
    e.preventDefault();

    setSaving(true);
    setError(null);

    try {
      if (editingDoctor) {
        await doctorsApi.update(
          editingDoctor.id,
          form
        );
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
            : "Failed to add doctor."
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // DELETE / ACTIVATE
  //
  // DELETE DOES NOT PHYSICALLY DELETE.
  // It changes status to inactive.
  // ============================================================
  async function handleStatusChange(
    doctor: Doctor
  ) {
    const isActive =
      doctor.status === "active";

    const confirmed = window.confirm(
      isActive
        ? `Delete ${doctor.full_name}?\n\nThis will deactivate the doctor. The doctor will NOT be permanently deleted and can be activated again later.`
        : `Activate ${doctor.full_name} again?`
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(doctor.id);
    setError(null);

    try {
      await doctorsApi.update(
        doctor.id,
        {
          status: isActive
            ? "inactive"
            : "active",
        }
      );

      await loadDoctors();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : isActive
            ? "Failed to deactivate doctor."
            : "Failed to activate doctor."
      );
    } finally {
      setActionLoading(null);
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div>
      {/* ========================================================
          HEADER
      ======================================================== */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-teal-950">
            Doctors ({doctors.length})
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage hospital doctors and their profiles.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              openAddForm();
            }
          }}
        >
          {showForm
            ? "Cancel"
            : "Add Doctor"}
        </button>
      </div>

      {/* ========================================================
          SUMMARY
      ======================================================== */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() =>
            setFilter("all")
          }
          className={`rounded-lg border bg-white p-4 text-left transition ${
            filter === "all"
              ? "border-teal-400 ring-2 ring-teal-100"
              : "border-slate-200 hover:border-teal-200"
          }`}
        >
          <div className="text-sm text-slate-500">
            All Doctors
          </div>

          <div className="mt-1 text-2xl font-semibold text-teal-950">
            {doctors.length}
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setFilter("active")
          }
          className={`rounded-lg border bg-white p-4 text-left transition ${
            filter === "active"
              ? "border-teal-400 ring-2 ring-teal-100"
              : "border-slate-200 hover:border-teal-200"
          }`}
        >
          <div className="text-sm text-slate-500">
            Active Doctors
          </div>

          <div className="mt-1 text-2xl font-semibold text-teal-700">
            {activeCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setFilter("inactive")
          }
          className={`rounded-lg border bg-white p-4 text-left transition ${
            filter === "inactive"
              ? "border-slate-400 ring-2 ring-slate-100"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="text-sm text-slate-500">
            Deactivated Doctors
          </div>

          <div className="mt-1 text-2xl font-semibold text-slate-600">
            {inactiveCount}
          </div>
        </button>
      </div>

      {/* ========================================================
          FILTER + SEARCH
      ======================================================== */}
      <div className="mt-6 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="text-sm font-medium text-slate-700">
            Show
          </label>

          <select
            value={filter}
            onChange={(e) =>
              setFilter(
                e.target.value as DoctorFilter
              )
            }
            className="input-field"
          >
            <option value="all">
              All Doctors
            </option>

            <option value="active">
              Active Doctors
            </option>

            <option value="inactive">
              Deactivated Doctors
            </option>
          </select>
        </div>

        <div className="w-full md:max-w-sm">
          <input
            type="text"
            className="input-field w-full"
            placeholder="Search doctor, specialty or department..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>
      </div>

      {/* ========================================================
          ERROR
      ======================================================== */}
      {error && !showForm && (
        <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ========================================================
          ADD / EDIT FORM
      ======================================================== */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card mt-4"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-teal-950">
              {editingDoctor
                ? "Edit Doctor"
                : "Add New Doctor"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {editingDoctor
                ? "Update the doctor's information below."
                : "Enter the doctor's information below."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Full Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Full Name
              </label>

              <input
                className="input-field w-full"
                placeholder="e.g. Dr. Farhan Baig"
                required
                value={form.full_name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    full_name:
                      e.target.value,
                  })
                }
              />
            </div>

            {/* Department */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Department
              </label>

              <select
                className="input-field w-full"
                required
                value={
                  form.department_id
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    department_id:
                      e.target.value,
                  })
                }
              >
                <option value="">
                  Select Department
                </option>

                {departments.map(
                  (department) => (
                    <option
                      key={
                        department.id
                      }
                      value={
                        department.id
                      }
                    >
                      {
                        department.name
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Specialization */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Specialization
              </label>

              <input
                className="input-field w-full"
                placeholder="e.g. Pediatrics Specialist"
                required
                value={
                  form.specialization
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    specialization:
                      e.target.value,
                  })
                }
              />
            </div>

            {/* Qualification */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Qualification
              </label>

              <input
                className="input-field w-full"
                placeholder="e.g. MBBS, FCPS"
                value={
                  form.qualification
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    qualification:
                      e.target.value,
                  })
                }
              />
            </div>

            {/* Experience */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Experience (Years)
              </label>

              <input
                type="number"
                min="0"
                className="input-field w-full"
                placeholder="e.g. 10"
                value={
                  form.experience_years
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    experience_years:
                      Number(
                        e.target.value
                      ),
                  })
                }
              />
            </div>

            {/* Consultation Fee */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Consultation Fee
              </label>

              <input
                type="number"
                min="0"
                className="input-field w-full"
                placeholder="e.g. 2500"
                value={
                  form.consultation_fee
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    consultation_fee:
                      Number(
                        e.target.value
                      ),
                  })
                }
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Description
              </label>

              <textarea
                className="input-field w-full"
                rows={4}
                placeholder="Enter doctor's professional description..."
                value={
                  form.description
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    description:
                      e.target.value,
                  })
                }
              />
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingDoctor
                  ? "Update Doctor"
                  : "Save Doctor"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="rounded-md border border-slate-300 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ========================================================
          DOCTORS TABLE
      ======================================================== */}
      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loadingDoctors ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading doctors...
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-sm font-medium text-slate-700">
              No doctors found
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Try changing the filter or search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    Name
                  </th>

                  <th className="px-4 py-3">
                    Department
                  </th>

                  <th className="px-4 py-3">
                    Specialization
                  </th>

                  <th className="px-4 py-3">
                    Fee
                  </th>

                  <th className="px-4 py-3">
                    Rating
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredDoctors.map(
                  (doctor) => {
                    const isActive =
                      doctor.status ===
                      "active";

                    const loading =
                      actionLoading ===
                      doctor.id;

                    return (
                      <tr
                        key={
                          doctor.id
                        }
                        className={`border-t border-slate-100 ${
                          !isActive
                            ? "bg-slate-50/70"
                            : ""
                        }`}
                      >
                        {/* Name */}
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {
                            doctor.full_name
                          }
                        </td>

                        {/* Department */}
                        <td className="px-4 py-3 text-slate-700">
                          {
                            doctor.department_name
                          }
                        </td>

                        {/* Specialization */}
                        <td className="px-4 py-3 text-slate-700">
                          {
                            doctor.specialization
                          }
                        </td>

                        {/* Fee */}
                        <td className="px-4 py-3 text-slate-700">
                          Rs.{" "}
                          {
                            doctor.consultation_fee
                          }
                        </td>

                        {/* Rating */}
                        <td className="px-4 py-3 text-slate-700">
                          {doctor.rating}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              isActive
                                ? "bg-teal-50 text-teal-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {isActive
                              ? "Active"
                              : "Deactivated"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  doctor
                                )
                              }
                              disabled={
                                loading
                              }
                              className="rounded-md border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50"
                            >
                              Edit
                            </button>

                            {/* Delete / Activate */}
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(
                                  doctor
                                )
                              }
                              disabled={
                                loading
                              }
                              className={`rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                                isActive
                                  ? "border-red-200 text-red-700 hover:bg-red-50"
                                  : "border-teal-200 text-teal-700 hover:bg-teal-50"
                              }`}
                            >
                              {loading
                                ? "..."
                                : isActive
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
        )}
      </div>
    </div>
  );
}