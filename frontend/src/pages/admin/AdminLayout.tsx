import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const links = [
  { to: "/admin/dashboard", label: "Overview" },
  { to: "/admin/doctors", label: "Doctors" },
  { to: "/admin/appointments", label: "Appointments" },
  { to: "/admin/pharmacy", label: "Pharmacy" },
  { to: "/admin/reports", label: "Reports" },
];

export default function AdminLayout() {
  const { staffUser, signOut } = useAuth("admin");

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 flex-shrink-0 bg-teal-950 text-teal-100">
        <div className="px-6 py-6 text-lg font-semibold text-white">Admin Panel</div>
        <nav className="flex flex-col gap-1 px-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm ${isActive ? "bg-teal-900 text-white" : "hover:bg-teal-900/60"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={signOut} className="mx-3 mt-8 rounded-md px-3 py-2 text-left text-sm text-teal-300 hover:bg-teal-900/60">
          Sign out
        </button>
      </aside>
      <main className="flex-1 bg-slate-50">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
          <div className="text-sm text-slate-500">Signed in as</div>
          <div className="text-sm font-medium text-teal-950">{staffUser?.fullName}</div>
        </div>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
