import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  Activity,
  Stethoscope,
  Calendar,
  Pill,
  TrendingUp,
  LogOut,
  Hospital,
  User,
  ShieldCheck,
  Menu,
  X,
  ArrowRight,
} from "../../components/icons/Icons";

const links = [
  { to: "/admin/dashboard", label: "Overview", icon: Activity },
  { to: "/admin/doctors", label: "Doctors Directory", icon: Stethoscope },
  { to: "/admin/appointments", label: "Appointments", icon: Calendar },
  { to: "/admin/pharmacy", label: "Pharmacy Stock", icon: Pill },
  { to: "/admin/reports", label: "Reports & Analytics", icon: TrendingUp },
];

export default function AdminLayout() {
  const { staffUser, signOut } = useAuth("admin");
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
              <Hospital className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-tight text-white">
                SMART HOSPITAL
              </span>
              <span className="block text-[10px] font-semibold tracking-wider text-teal-400 uppercase">
                Admin Console
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
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-6">
          <div className="px-3 pb-2 text-[10px] font-bold tracking-widest text-teal-400 uppercase">
            Operations & Management
          </div>
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? "bg-teal-700/70 text-white shadow-sm ring-1 ring-teal-500/40"
                      : "text-slate-300 hover:bg-teal-900/60 hover:text-white"
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0 text-teal-300" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="pt-6">
            <div className="px-3 pb-2 text-[10px] font-bold tracking-widest text-teal-400 uppercase">
              Quick Links
            </div>
            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-slate-300 hover:bg-teal-900/60 hover:text-white"
            >
              <span>Public Website</span>
              <ArrowRight className="h-3 w-3 text-teal-400" />
            </Link>
          </div>
        </nav>

        {/* User Info & Sign Out Footer */}
        <div className="border-t border-teal-900/80 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-teal-900/40 p-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-800 text-xs font-bold text-white">
              {staffUser?.fullName ? staffUser.fullName.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-white">
                {staffUser?.fullName || "Administrator"}
              </div>
              <div className="text-[10px] text-teal-300">
                Hospital Admin Role
              </div>
            </div>
          </div>

          <button
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-800/80 bg-teal-900/30 px-3 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 hover:text-rose-200"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-2 text-xs font-medium text-slate-500 sm:flex">
              <span>Admin Portal</span>
              <span>/</span>
              <span className="font-semibold text-teal-950">Management Dashboard</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin Privileges Active</span>
            </div>

            <div className="hidden text-right text-xs sm:block">
              <div className="font-bold text-teal-950">{staffUser?.fullName}</div>
              <div className="text-slate-400">{staffUser?.email || "admin@hospital.com"}</div>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
