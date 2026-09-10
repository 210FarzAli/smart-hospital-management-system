import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { departmentsApi, doctorsApi } from "../../lib/apiClient";
import type { Department, Doctor } from "../../lib/types";
import DoctorCard from "../../components/DoctorCard";

export default function DepartmentDetail() {
  const { id } = useParams();
  const [department, setDepartment] = useState<Department | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    if (!id) return;
    departmentsApi.get(id).then(setDepartment).catch(console.error);
    doctorsApi.list({ departmentId: id }).then(setDoctors).catch(console.error);
  }, [id]);

  if (!department) return <div className="mx-auto max-w-6xl px-6 py-12 text-slate-500">Loading...</div>;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-teal-950">{department.name}</h1>
      <p className="mt-2 max-w-2xl text-slate-600">{department.description}</p>

      <h2 className="mt-10 text-xl font-semibold text-teal-950">
        Doctors in {department.name} ({doctors.length})
      </h2>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {doctors.map((doc) => (
          <DoctorCard key={doc.id} doctor={doc} />
        ))}
      </div>
    </div>
  );
}
