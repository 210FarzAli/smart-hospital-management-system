import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Stethoscope,
  Calendar,
  Clock,
  DollarSign,
  User,
  Plus,
  Trash,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
} from "../../components/icons/Icons";

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  "http://localhost:5000/api";

interface Availability {
  day: string;
  start_time: string;
  end_time: string;
}

interface DoctorProfileData {
  id: string;
  department_id: string;
  department_name?: string;
  full_name: string;
  specialization: string;
  qualification: string | null;
  experience_years: number;
  consultation_fee: number;
  description: string | null;
  photo_url: string | null;
  status: string;
  availability: Availability[];
}

interface Department {
  id: string;
  name: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatTime(time: string) {
  if (!time) return "";
  const [hourString, minuteString] = time.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return time;
  }

  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DoctorProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [fullName, setFullName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [qualification, setQualification] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [availability, setAvailability] = useState<Availability[]>([]);

  useEffect(() => {
    loadProfile();
    loadDepartments();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const storedUser = localStorage.getItem("hospital_user");
      if (!storedUser) {
        navigate("/doctor/login");
        return;
      }

      const user = JSON.parse(storedUser);
      if (!user.doctorId) {
        throw new Error("No doctor profile is linked to this account.");
      }

      const token = localStorage.getItem("hospital_token");
      const response = await fetch(`${BASE_URL}/doctors/${user.doctorId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to load your profile.");
      }

      setProfile(data);
      setFullName(data.full_name || "");
      setDepartmentId(data.department_id || "");
      setSpecialization(data.specialization || "");
      setQualification(data.qualification || "");
      setExperienceYears(String(data.experience_years ?? ""));
      setConsultationFee(String(data.consultation_fee ?? ""));
      setDescription(data.description || "");
      setPhotoUrl(data.photo_url || "");
      setAvailability(Array.isArray(data.availability) ? data.availability : []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to load doctor profile."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadDepartments() {
    try {
      const response = await fetch(`${BASE_URL}/departments`);
      const data = await response.json();
      if (response.ok) {
        setDepartments(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function addAvailability() {
    setAvailability((prev) => [
      ...prev,
      {
        day: "Mon",
        start_time: "09:00",
        end_time: "17:00",
      },
    ]);
  }

  function removeAvailability(index: number) {
    setAvailability((prev) => prev.filter((_, i) => i !== index));
  }

  function updateAvailability(
    index: number,
    field: keyof Availability,
    value: string
  ) {
    setAvailability((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("hospital_token");
      const response = await fetch(`${BASE_URL}/doctors/${profile.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          department_id: departmentId,
          full_name: fullName.trim(),
          specialization: specialization.trim(),
          qualification: qualification.trim() || null,
          experience_years: Number(experienceYears) || 0,
          consultation_fee: Number(consultationFee) || 0,
          description: description.trim() || null,
          photo_url: photoUrl.trim() || null,
          availability,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to update profile.");
      }

      setProfile(data);
      setSuccess("Your professional profile & OPD shift schedule were updated successfully.");

      const storedUser = localStorage.getItem("hospital_user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.fullName = data.full_name;
        localStorage.setItem("hospital_user", JSON.stringify(user));
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card py-16 text-center text-slate-400">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
        <p className="mt-2 text-xs">Loading doctor profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-xl bg-rose-50 p-6 text-xs text-rose-800 ring-1 ring-rose-200">
        {error || "Doctor profile could not be loaded."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Physician Credentials & OPD Schedule
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            My Doctor Profile
          </h1>
          <p className="text-xs text-slate-500">
            Configure your clinical qualifications, OPD fee, and weekly working shift timings.
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            profile.status === "active"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              profile.status === "active" ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
          {profile.status === "active" ? "Profile Active" : "Profile Deactivated"}
        </span>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-800 ring-1 ring-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Professional Information Card */}
        <div className="card p-6">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Stethoscope className="h-4 w-4 text-teal-700" />
            <h2 className="text-sm font-bold text-teal-950">
              Professional & Clinical Credentials
            </h2>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field mt-1.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                Department <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="input-field mt-1.5 text-xs"
              >
                <option value="">Select Department</option>
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
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="input-field mt-1.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                Degrees & Qualifications
              </label>
              <input
                type="text"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                className="input-field mt-1.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                Clinical Experience (Years)
              </label>
              <input
                type="number"
                min="0"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="input-field mt-1.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                OPD Consultation Fee (PKR) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="50"
                required
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                className="input-field mt-1.5 text-xs"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
              Physician Biography
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field mt-1.5 text-xs"
            />
          </div>

          <div className="mt-4">
            <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
              Profile Photo URL
            </label>
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="input-field mt-1.5 text-xs"
            />
          </div>
        </div>

        {/* Working Schedule & Shifts Card */}
        <div className="card p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <Calendar className="h-4 w-4 text-teal-700" />
              <div>
                <h2 className="text-sm font-bold text-teal-950">
                  Weekly OPD Working Shifts
                </h2>
                <p className="text-xs text-slate-500">
                  Patients book these shifts on the public website.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={addAvailability}
              className="btn-outline inline-flex items-center gap-1.5 text-xs py-1.5 px-3 self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Shift Day
            </button>
          </div>

          {availability.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-amber-50/60 p-6 text-center ring-1 ring-amber-200">
              <p className="text-xs text-amber-800 font-medium">
                No working shifts are configured. Patients will not be able to book appointments with you until you add at least one shift.
              </p>
              <button
                type="button"
                onClick={addAvailability}
                className="mt-3 btn-primary text-xs"
              >
                Add Your First Shift
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {availability.map((shift, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-12"
                >
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">
                      Day
                    </label>
                    <select
                      value={shift.day}
                      onChange={(e) => updateAvailability(idx, "day", e.target.value)}
                      className="input-field mt-1 text-xs"
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">
                      Shift Start
                    </label>
                    <input
                      type="time"
                      value={shift.start_time}
                      onChange={(e) =>
                        updateAvailability(idx, "start_time", e.target.value)
                      }
                      className="input-field mt-1 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">
                      Shift End
                    </label>
                    <input
                      type="time"
                      value={shift.end_time}
                      onChange={(e) =>
                        updateAvailability(idx, "end_time", e.target.value)
                      }
                      className="input-field mt-1 text-xs"
                    />
                  </div>

                  <div className="flex sm:col-span-3 items-end justify-between sm:justify-end gap-2 pt-2 sm:pt-4">
                    <span className="text-xs font-semibold text-teal-900 bg-teal-100/60 px-2 py-1 rounded-md">
                      {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAvailability(idx)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Remove Shift"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary inline-flex items-center gap-2 py-3 px-8 shadow-md shadow-teal-900/10 text-xs disabled:opacity-60"
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving Changes...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Save Profile & Schedule
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}