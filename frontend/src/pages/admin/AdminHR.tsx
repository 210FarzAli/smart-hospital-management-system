import { useEffect, useState, FormEvent } from "react";
import { adminApi } from "../../lib/apiClient";
import {
  Users,
  ShieldCheck,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  Calendar,
  X,
  Edit2,
  Building,
} from "../../components/icons/Icons";

export default function AdminHR() {
  const [hrList, setHrList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("Human Resources Manager");
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));

  async function loadHR() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.hrList();
      setHrList(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load HR staff accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHR();
  }, []);

  async function handleCreateHR(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      alert("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      await adminApi.createHR({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        designation: designation.trim() || "HR Specialist",
        joining_date: joiningDate,
      });
      setModalOpen(false);
      setFullName("");
      setEmail("");
      setPassword("");
      setPhone("");
      loadHR();
    } catch (err: any) {
      alert(err.message || "Failed to create HR account.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(user: any) {
    const nextStatus = !user.is_active;
    const confirmMsg = nextStatus
      ? `Reactivate HR access for ${user.full_name}?`
      : `Deactivate HR account for ${user.full_name}? They will not be able to log in.`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(user.id);
    try {
      await adminApi.toggleHRStatus(user.id, nextStatus);
      loadHR();
    } catch (err: any) {
      alert(err.message || "Failed to update account status.");
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = hrList.filter((hr) => {
    const q = search.toLowerCase();
    return (
      hr.full_name?.toLowerCase().includes(q) ||
      hr.email?.toLowerCase().includes(q) ||
      hr.designation?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Executive Governance & Human Resources
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Human Resources Management ({hrList.length})
          </h1>
          <p className="text-xs text-slate-500">
            Provision, manage, and govern HR Directorate accounts responsible for hospital workforce administration.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="btn-primary inline-flex items-center gap-2 text-xs shadow-md shadow-teal-900/10"
        >
          <Plus className="h-4 w-4" />
          Provision New HR Staff
        </button>
      </div>

      {/* Governance Model Explanation Card */}
      <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4.5 text-xs text-teal-950 flex items-start gap-3.5 shadow-xs">
        <Building className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-teal-900 text-sm">Hospital Authority Hierarchy: Admin &rarr; HR &rarr; Staff</p>
          <p className="mt-1 text-teal-800 leading-relaxed">
            The <b>Administrator</b> provisions and manages HR Directorate personnel. In turn, <b>Human Resources (HR)</b> oversees all hospital employees, including Doctors, Laboratory staff, Pharmacy staff, Receptionists, and operational workers.
          </p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="card flex items-center justify-between p-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search HR staff by name, email, or designation..."
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

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-800 ring-1 ring-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* HR Accounts Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <th className="px-5 py-3.5">HR Personnel</th>
                <th className="px-5 py-3.5">Contact Details</th>
                <th className="px-5 py-3.5">Designation</th>
                <th className="px-5 py-3.5">Provisioned Date</th>
                <th className="px-5 py-3.5">Account Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
                    <p className="mt-2">Loading HR personnel accounts...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No HR staff accounts found matching your query.
                  </td>
                </tr>
              ) : (
                filtered.map((hr) => {
                  const isActive = Boolean(hr.is_active);
                  return (
                    <tr key={hr.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 font-bold text-teal-900">
                            {hr.full_name?.slice(0, 2).toUpperCase() || "HR"}
                          </div>
                          <div>
                            <div className="font-bold text-teal-950">{hr.full_name}</div>
                            <div className="text-[11px] font-mono text-slate-500">{hr.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <div>{hr.phone || "No phone listed"}</div>
                        <div className="text-[11px] text-slate-400">Corporate Staff</div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-block rounded-md bg-teal-50 border border-teal-200 px-2.5 py-1 font-semibold text-teal-900">
                          {hr.designation || "Human Resources Specialist"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {hr.created_at ? String(hr.created_at).slice(0, 10) : "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            isActive
                              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                              : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-rose-400"
                            }`}
                          />
                          {isActive ? "Active Account" : "Deactivated"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(hr)}
                          disabled={actionLoading === hr.id}
                          className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                            isActive
                              ? "text-rose-600 hover:bg-rose-50"
                              : "text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {actionLoading === hr.id
                            ? "Updating..."
                            : isActive
                            ? "Deactivate Access"
                            : "Reactivate Access"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create HR Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-teal-950">Provision New HR Staff Account</h3>
                <p className="text-xs text-slate-500">
                  Create credentials and onboarding details for Human Resources staff.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHR} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Maria Siddiqui"
                  className="input-field mt-1.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Corporate Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hr.officer@hospital.local"
                    className="input-field mt-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Login Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field mt-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03001234567"
                    className="input-field mt-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. HR Generalist"
                    className="input-field mt-1.5 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Joining Date
                </label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="input-field mt-1.5 text-xs"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-xs px-5 py-2"
                >
                  {saving ? "Provisioning..." : "Create HR Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
