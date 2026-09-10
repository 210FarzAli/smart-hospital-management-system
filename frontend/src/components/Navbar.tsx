import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Home" },
  { to: "/departments", label: "Departments" },
  { to: "/doctors", label: "Doctors" },
  { to: "/reviews", label: "Reviews" },
  { to: "/assistant", label: "AI Health Assistant" },
];

export default function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <NavLink to="/" className="text-lg font-semibold text-teal-900">
          City Care Hospital
        </NavLink>
        <nav className="hidden gap-6 text-sm font-medium text-slate-600 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? "text-teal-900" : "hover:text-teal-700")}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/book" className="btn-primary">
          Book Appointment
        </NavLink>
      </div>
    </header>
  );
}
