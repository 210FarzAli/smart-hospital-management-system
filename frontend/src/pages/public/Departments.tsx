import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { departmentsApi } from "../../lib/apiClient";
import type { Department } from "../../lib/types";

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    departmentsApi.list().then(setDepartments).catch(console.error);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-teal-950">Departments</h1>
      <p className="mt-2 text-slate-600">Every department is staffed by at least 10 doctors.</p>
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
        {departments.map((d) => (
          <Link key={d.id} to={`/departments/${d.id}`} className="card hover:shadow-md">
            <div className="text-lg font-medium text-teal-950">{d.name}</div>
            <p className="mt-2 text-sm text-slate-500">{d.description}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {d.services?.map((s) => (
                <li key={s} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs text-teal-800">
                  {s}
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>
    </div>
  );
}
