import { useEffect, useState, FormEvent } from "react";
import { hrApi, departmentsApi } from "../../lib/apiClient";
import type { Employee, Department } from "../../lib/types";
import {
  Users,
  Search,
  Plus,
  Building,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  X,
  Edit2,
  DollarSign,
  AlertCircle,
} from "../../components/icons/Icons";

export default function HREmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [designation, setDesignation] = useState("");
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [qualification, setQualification] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [basicSalary, setBasicSalary] = useState("75000");
  const [allowances, setAllowances] = useState("10000");
  const [overtimeRate, setOvertimeRate] = useState("400");

  async function loadData() {
    setLoading(true);
    try {
      const [empList, deptList] = await Promise.all([
        hrApi.employees({
          search,
          department_id: selectedDept,
          status: selectedStatus,
        }),
        departmentsApi.list(),
      ]);
      setEmployees(empList || []);
      setDepartments(deptList || []);
      if (!departmentId && deptList && deptList.length > 0) {
        setDepartmentId(deptList[0].id);
      }
    } catch (err) {
      console.error("Failed to load employees:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedDept, selectedStatus]);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    loadData();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await hrApi.createEmployee({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        department_id: departmentId || null,
        designation: designation.trim(),
        joining_date: joiningDate,
        employment_status: "active",
        qualification: qualification.trim() || null,
        emergency_contact: emergencyContact.trim() || null,
        basic_salary: Number(basicSalary) || 0,
        allowances: Number(allowances) || 0,
        overtime_rate: Number(overtimeRate) || 0,
      });

      setIsModalOpen(false);
      // Reset form
      setFullName("");
      setPhone("");
      setEmail("");
      setDesignation("");
      setQualification("");
      setEmergencyContact("");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to register employee.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Hospital Employee Directory
          </h1>
          <p className="text-xs text-slate-500">
            Maintain clinical, nursing, administrative, and operations personnel records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="btn-primary inline-flex items-center gap-2 text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Register New Staff</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, email, or designation..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </div>
          <button type="submit" className="btn-secondary text-xs">
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
              Loading employee records...
            </div>
          </div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No employee records match the search filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="px-5 py-3.5">Employee Name & Role</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Joining Date</th>
                  <th className="px-5 py-3.5">Basic Salary</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{emp.full_name}</div>
                      <div className="text-[11px] font-medium text-teal-700">{emp.designation}</div>
                      {emp.qualification && (
                        <div className="text-[10px] text-slate-400">{emp.qualification}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{emp.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Mail className="h-3 w-3 text-slate-400" />
                        <span>{emp.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-800">
                        <Building className="h-3 w-3" />
                        {emp.department_name || "General Facility"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {String(emp.joining_date).slice(0, 10)}
                    </td>
                    <td className="px-5 py-4 font-bold text-teal-950">
                      Rs. {Number(emp.basic_salary || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          emp.employment_status === "active"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : emp.employment_status === "on_leave"
                            ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                            : "bg-red-50 text-red-700 ring-1 ring-red-200"
                        }`}
                      >
                        {emp.employment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-teal-950">Register Hospital Employee</h3>
                <p className="text-xs text-slate-500">Add new clinician, nurse, or administrative staff</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Salman Qureshi"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="salman@hospital.local"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-600 focus:outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Designation *</label>
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Clinical Pharmacist"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Qualifications</label>
                  <input
                    type="text"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    placeholder="e.g. MBBS, FCPS"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Compensation Structure */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                <div className="font-bold text-teal-950">Compensation Structure</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-medium text-slate-600 text-[11px]">Basic Salary (Rs.)</label>
                    <input
                      type="number"
                      value={basicSalary}
                      onChange={(e) => setBasicSalary(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 text-[11px]">Allowances (Rs.)</label>
                    <input
                      type="number"
                      value={allowances}
                      onChange={(e) => setAllowances(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 text-[11px]">Overtime / Hr (Rs.)</label>
                    <input
                      type="number"
                      value={overtimeRate}
                      onChange={(e) => setOvertimeRate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-xs"
                >
                  {saving ? "Registering..." : "Save Employee Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
