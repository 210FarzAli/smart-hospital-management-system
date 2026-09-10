import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const links = [
  {
    to: "/doctor/appointments",
    label: "My Appointments",
  },
  {
    to: "/doctor/patients",
    label: "Patients",
  },
  {
    to: "/doctor/profile",
    label: "My Profile",
  },
];

export default function DoctorLayout() {
  const { staffUser, signOut } = useAuth("doctor");

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 flex-shrink-0 bg-teal-700 text-teal-50">
        <div className="px-6 py-6 text-lg font-semibold text-white">
          Doctor Panel
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm ${
                  isActive
                    ? "bg-teal-900 text-white"
                    : "hover:bg-teal-900/40"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={signOut}
          className="mx-3 mt-8 rounded-md px-3 py-2 text-left text-sm text-teal-100 hover:bg-teal-900/40"
        >
          Sign out
        </button>
      </aside>

      <main className="flex-1 bg-slate-50">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
          <div className="text-sm text-slate-500">Signed in as</div>

          <div className="text-sm font-medium text-teal-950">
            {staffUser?.fullName}
          </div>
        </div>

        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}