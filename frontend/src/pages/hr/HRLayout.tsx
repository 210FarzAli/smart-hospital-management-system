import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  Users,
  Activity,
  FileText,
  DollarSign,
  LogOut,
  Hospital,
  ShieldCheck,
  Menu,
  X,
  User,
  CheckCircle,
  Stethoscope,
} from "../../components/icons/Icons";

const links = [
  { to: "/hr/dashboard", label: "HR Overview", icon: Activity },
  { to: "/hr/employees", label: "Employee Directory", icon: Users },
  { to: "/hr/doctors", label: "Doctors & Specialists", icon: Stethoscope },
  { to: "/hr/attendance", label: "Attendance & Leaves", icon: CheckCircle },
  { to: "/hr/payroll", label: "Payroll & Compensation", icon: DollarSign },
];

export default function HRLayout() {
  const { staffUser, signOut } = useAuth("hr");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      {/* Mobile Drawer Backdrop */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-teal-950 text-slate-300 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-teal-900/80 px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-tight text-white">
                SMART HOSPITAL
              </span>
              <span className="block text-[10px] font-semibold tracking-wider text-teal-400 uppercase">
                Human Resources Suite
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="rounded-lg p-1 text-teal-400 hover:bg-teal-900 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <div className="px-3 pb-2 text-[10px] font-bold tracking-widest text-teal-400 uppercase">
            Workforce Management
          </div>
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-teal-700 text-white shadow-sm"
                      : "text-slate-300 hover:bg-teal-900/80 hover:text-white"
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[10px] font-bold tracking-widest text-teal-400 uppercase">
            Quick Links
          </div>
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs text-teal-300/80 hover:bg-teal-900/50 hover:text-teal-200"
          >
            <Hospital className="h-3.5 w-3.5" />
            <span>Admin Portal</span>
          </Link>
          <Link
            to="/reception/dashboard"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs text-teal-300/80 hover:bg-teal-900/50 hover:text-teal-200"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Front Desk Reception</span>
          </Link>
        </nav>

        {/* User Info & Sign Out Footer */}
        <div className="border-t border-teal-900/80 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-teal-900/40 p-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-800 text-teal-200">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {staffUser?.fullName || "HR Manager"}
              </p>
              <span className="inline-block rounded bg-teal-900 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-teal-300 uppercase">
                {staffUser?.role || "HR"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-800/80 bg-teal-900/20 py-2 text-xs font-semibold text-slate-300 transition hover:bg-red-950/40 hover:text-red-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top App Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-slate-400">Department Administration</div>
              <div className="text-sm font-extrabold text-teal-950">Hospital HR Operations</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 sm:flex">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Payroll Audit Verified
            </div>
            <Link
              to="/"
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Public Site
            </Link>
          </div>
        </header>

        {/* Child Routes */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
