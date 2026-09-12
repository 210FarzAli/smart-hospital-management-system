import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  Activity,
  Calendar,
  FileText,
  LogOut,
  Hospital,
  ShieldCheck,
  Menu,
  X,
  ArrowRight,
  User,
} from "../../components/icons/Icons";

const links = [
  { to: "/lab/dashboard", label: "Overview", icon: Activity },
  { to: "/lab/bookings", label: "Bookings & Samples", icon: Calendar },
  { to: "/lab/results", label: "Diagnostic Results Entry", icon: FileText },
];

export default function LaboratoryLayout() {
  const { staffUser, signOut } = useAuth("laboratorist");
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
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-tight text-white">
                SMART HOSPITAL
              </span>
              <span className="block text-[10px] font-semibold tracking-wider text-teal-400 uppercase">
                Laboratory Suite
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
            Laboratory Navigation
          </div>
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-teal-700 text-white shadow-sm"
                      : "text-slate-300 hover:bg-teal-900/60 hover:text-white"
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
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
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-slate-300 hover:bg-teal-900/60 hover:text-white"
            >
              <span>Hospital Home</span>
              <ArrowRight className="h-3 w-3 text-teal-400" />
            </Link>
          </div>
        </nav>

        {/* User Info & Sign Out Footer */}
        <div className="border-t border-teal-900/80 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-teal-900/40 p-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-800 text-xs font-bold text-white">
              {staffUser?.fullName ? staffUser.fullName.charAt(0).toUpperCase() : "L"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-white">
                {staffUser?.fullName || "Laboratorist"}
              </div>
              <div className="text-[10px] text-teal-300">
                Diagnostic Pathology Role
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-800/80 bg-teal-900/30 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-teal-700" />
              <span>Smart Hospital Central Laboratory</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-800">
                {staffUser?.fullName || "Lab Specialist"}
              </div>
              <div className="text-[10px] text-slate-500">Pathology Intake</div>
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
