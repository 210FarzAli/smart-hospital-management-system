import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

const DAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

function formatTime(time: string) {
  if (!time) return "";

  const [hourString, minuteString] =
    time.split(":");

  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
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

  const [profile, setProfile] =
    useState<DoctorProfileData | null>(null);

  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [fullName, setFullName] =
    useState("");

  const [departmentId, setDepartmentId] =
    useState("");

  const [specialization, setSpecialization] =
    useState("");

  const [qualification, setQualification] =
    useState("");

  const [experienceYears, setExperienceYears] =
    useState("");

  const [consultationFee, setConsultationFee] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [photoUrl, setPhotoUrl] =
    useState("");

  const [availability, setAvailability] =
    useState<Availability[]>([]);

  useEffect(() => {
    loadProfile();
    loadDepartments();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const storedUser =
        localStorage.getItem("hospital_user");

      if (!storedUser) {
        navigate("/doctor/login");
        return;
      }

      const user = JSON.parse(storedUser);

      if (!user.doctorId) {
        throw new Error(
          "No doctor profile is linked to this account."
        );
      }

      const token =
        localStorage.getItem("hospital_token");

      const response = await fetch(
        `${BASE_URL}/doctors/${user.doctorId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load your profile."
        );
      }

      setProfile(data);

      setFullName(data.full_name || "");

      setDepartmentId(
        data.department_id || ""
      );

      setSpecialization(
        data.specialization || ""
      );

      setQualification(
        data.qualification || ""
      );

      setExperienceYears(
        String(data.experience_years ?? "")
      );

      setConsultationFee(
        String(data.consultation_fee ?? "")
      );

      setDescription(
        data.description || ""
      );

      setPhotoUrl(
        data.photo_url || ""
      );

      setAvailability(
        Array.isArray(data.availability)
          ? data.availability
          : []
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load your profile."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadDepartments() {
    try {
      const response = await fetch(
        `${BASE_URL}/departments`
      );

      const data = await response.json();

      if (response.ok) {
        setDepartments(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function addAvailability() {
    setAvailability((previous) => [
      ...previous,
      {
        day: "Mon",
        start_time: "09:00",
        end_time: "17:00",
      },
    ]);
  }

  function removeAvailability(index: number) {
    setAvailability((previous) =>
      previous.filter(
        (_, i) => i !== index
      )
    );
  }

  function updateAvailability(
    index: number,
    field: keyof Availability,
    value: string
  ) {
    setAvailability((previous) =>
      previous.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!profile) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const token =
        localStorage.getItem("hospital_token");

      const response = await fetch(
        `${BASE_URL}/doctors/${profile.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            department_id: departmentId,
            full_name: fullName.trim(),
            specialization:
              specialization.trim(),
            qualification:
              qualification.trim() || null,
            experience_years:
              Number(experienceYears) || 0,
            consultation_fee:
              Number(consultationFee) || 0,
            description:
              description.trim() || null,
            photo_url:
              photoUrl.trim() || null,
            availability,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to update profile."
        );
      }

      setProfile(data);

      setSuccess(
        "Your profile has been updated successfully."
      );

      // Keep the cached login name synchronized.
      const storedUser =
        localStorage.getItem("hospital_user");

      if (storedUser) {
        const user = JSON.parse(storedUser);

        user.fullName =
          data.full_name;

        localStorage.setItem(
          "hospital_user",
          JSON.stringify(user)
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <p className="text-slate-500">
          Loading your profile...
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm text-red-700">
          {error ||
            "Your doctor profile could not be loaded."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-teal-950">
          My Profile
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          View and update your professional
          information and working shifts.
        </p>
      </div>

      {/* Status */}
      <div className="mt-5 flex items-center gap-3">
        <span className="text-sm text-slate-500">
          Account status:
        </span>

        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            profile.status === "active"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {profile.status === "active"
            ? "Active"
            : "Inactive"}
        </span>
      </div>

      {/* Messages */}
      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      {success && (
        <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-700">
            {success}
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-6"
      >
        {/* Basic Information */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-teal-950">
            Professional Information
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Full Name */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Full Name
              </label>

              <input
                className="input-field mt-1 w-full"
                value={fullName}
                onChange={(event) =>
                  setFullName(
                    event.target.value
                  )
                }
                required
              />
            </div>

            {/* Department */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Department
              </label>

              <select
                className="input-field mt-1 w-full"
                value={departmentId}
                onChange={(event) =>
                  setDepartmentId(
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Select department
                </option>

                {departments.map(
                  (department) => (
                    <option
                      key={department.id}
                      value={department.id}
                    >
                      {department.name}
                    </option>
                  )
                )}
              </select>

              {profile.department_name && (
                <p className="mt-1 text-xs text-slate-500">
                  Current:{" "}
                  {profile.department_name}
                </p>
              )}
            </div>

            {/* Specialization */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Specialization
              </label>

              <input
                className="input-field mt-1 w-full"
                value={specialization}
                onChange={(event) =>
                  setSpecialization(
                    event.target.value
                  )
                }
                required
              />
            </div>

            {/* Qualification */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Qualification
              </label>

              <input
                className="input-field mt-1 w-full"
                value={qualification}
                onChange={(event) =>
                  setQualification(
                    event.target.value
                  )
                }
              />
            </div>

            {/* Experience */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Experience (Years)
              </label>

              <input
                type="number"
                min="0"
                className="input-field mt-1 w-full"
                value={experienceYears}
                onChange={(event) =>
                  setExperienceYears(
                    event.target.value
                  )
                }
              />
            </div>

            {/* Consultation Fee */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Consultation Fee
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field mt-1 w-full"
                value={consultationFee}
                onChange={(event) =>
                  setConsultationFee(
                    event.target.value
                  )
                }
              />
            </div>
          </div>

          {/* Description */}
          <div className="mt-5">
            <label className="text-sm font-medium text-slate-700">
              Description
            </label>

            <textarea
              className="input-field mt-1 w-full"
              rows={5}
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Write a short professional description..."
            />
          </div>

          {/* Photo URL */}
          <div className="mt-5">
            <label className="text-sm font-medium text-slate-700">
              Profile Photo URL
            </label>

            <input
              type="url"
              className="input-field mt-1 w-full"
              value={photoUrl}
              onChange={(event) =>
                setPhotoUrl(
                  event.target.value
                )
              }
              placeholder="https://example.com/doctor-photo.jpg"
            />

            <p className="mt-1 text-xs text-slate-500">
              Add a public image URL for your
              profile photo.
            </p>
          </div>
        </section>

        {/* Working Schedule */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-teal-950">
                Working Schedule
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Set your working days and shifts.
              </p>
            </div>

            <button
              type="button"
              onClick={addAvailability}
              className="rounded-md border border-teal-700 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
            >
              + Add Shift
            </button>
          </div>

          {availability.length === 0 ? (
            <div className="mt-5 rounded-lg bg-slate-50 p-5 text-center">
              <p className="text-sm text-slate-500">
                No working shifts have been added.
              </p>

              <button
                type="button"
                onClick={addAvailability}
                className="mt-2 text-sm font-medium text-teal-700 hover:underline"
              >
                Add your first shift
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {availability.map(
                (shift, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-4"
                  >
                    {/* Day */}
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        Day
                      </label>

                      <select
                        className="input-field mt-1 w-full"
                        value={shift.day}
                        onChange={(event) =>
                          updateAvailability(
                            index,
                            "day",
                            event.target.value
                          )
                        }
                      >
                        {DAYS.map((day) => (
                          <option
                            key={day}
                            value={day}
                          >
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Start */}
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        Start Time
                      </label>

                      <input
                        type="time"
                        className="input-field mt-1 w-full"
                        value={
                          shift.start_time
                        }
                        onChange={(event) =>
                          updateAvailability(
                            index,
                            "start_time",
                            event.target.value
                          )
                        }
                      />
                    </div>

                    {/* End */}
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        End Time
                      </label>

                      <input
                        type="time"
                        className="input-field mt-1 w-full"
                        value={
                          shift.end_time
                        }
                        onChange={(event) =>
                          updateAvailability(
                            index,
                            "end_time",
                            event.target.value
                          )
                        }
                      />
                    </div>

                    {/* Remove */}
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() =>
                          removeAvailability(
                            index
                          )
                        }
                        className="w-full rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Preview */}
                    <div className="sm:col-span-4">
                      <p className="text-xs text-slate-500">
                        Shift preview
                      </p>

                      <p className="mt-1 text-sm font-medium text-teal-950">
                        {shift.day}:{" "}
                        {formatTime(
                          shift.start_time
                        )}{" "}
                        –{" "}
                        {formatTime(
                          shift.end_time
                        )}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* Save */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}