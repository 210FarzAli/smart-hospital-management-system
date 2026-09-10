import { useEffect, useState } from "react";
import { departmentsApi, doctorsApi } from "../../lib/apiClient";
import type { Department, Doctor } from "../../lib/types";
import DoctorCard from "../../components/DoctorCard";

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("all");

  useEffect(() => {
    departmentsApi.list().then(setDepartments).catch(console.error);
  }, []);

  useEffect(() => {
    doctorsApi
      .list(departmentId !== "all" ? { departmentId } : {})
      .then(setDoctors)
      .catch(console.error);
  }, [departmentId]);

  const filtered = doctors.filter(
    (d) =>
      d.full_name.toLowerCase().includes(search.toLowerCase()) ||
      d.specialization.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-teal-950">Find a Doctor</h1>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          className="input-field sm:max-w-xs"
          placeholder="Search by name or specialization"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input-field sm:max-w-xs"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {filtered.map((doc) => (
          <DoctorCard key={doc.id} doctor={doc} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="mt-10 text-center text-slate-500">No doctors match your search.</p>
      )}
    </div>
  );
}
