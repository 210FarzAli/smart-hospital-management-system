import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  HeartPulseIcon,
  PhoneIcon,
  ClockIcon,
  SparklesIcon,
  CalendarIcon,
  MenuIcon,
  XIcon,
  ShieldCheckIcon,
} from "./icons/Icons";

const links = [
  { to: "/", label: "Home" },
  { to: "/departments", label: "Departments" },
  { to: "/doctors", label: "Doctors" },
  { to: "/laboratory", label: "Laboratory" },
  { to: "/pharmacy-shop", label: "Pharmacy" },
  { to: "/reviews", label: "Reviews" },
  {
    to: "/assistant",
    label: "AI Health Assistant",
    isAi: true,
  },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-sm shadow-slate-900/5">
      {/* Top Utility & Emergency Bar */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-teal-950 text-slate-200 text-xs py-2 px-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="font-medium text-rose-300">24/7 Emergency:</span>
              <a
                href="tel:021111227391"
                className="font-bold text-white hover:text-rose-200 transition-colors"
              >
                (021) 111-CARE-911
              </a>
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-slate-300">
              <ClockIcon className="w-3.5 h-3.5 text-teal-400" />
              <span>OPD: Mon – Sat 08:00 AM – 10:00 PM</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-300 text-[11px] sm:text-xs">
            <span className="hidden sm:inline text-slate-400">Staff Portals:</span>
            <Link
              to="/admin/login"
              className="hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              Admin
            </Link>
            <span className="text-slate-600">•</span>
            <Link
              to="/doctor/login"
              className="hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              Doctor
            </Link>
            <span className="text-slate-600">•</span>
            <Link
              to="/pharmacy/login"
              className="hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              Pharmacy
            </Link>
            <span className="text-slate-600">•</span>
            <Link
              to="/lab/login"
              className="hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              Laboratory
            </Link>
            <span className="text-slate-600">•</span>
            <Link
              to="/hr/login"
              className="hover:text-white transition-colors underline-offset-4 hover:underline font-semibold text-teal-300"
            >
              HR
            </Link>
            <span className="text-slate-600">•</span>
            <Link
              to="/reception/login"
              className="hover:text-white transition-colors underline-offset-4 hover:underline font-semibold text-teal-300"
            >
              Reception
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-900 via-teal-800 to-teal-700 text-white shadow-md shadow-teal-900/20 group-hover:scale-105 transition-transform duration-200">
              <HeartPulseIcon className="w-6 h-6 text-teal-200" />
            </div>
            <div>
              <div className="text-lg font-extrabold tracking-tight text-teal-950 flex items-center gap-1.5">
                <span>City Care</span>
                <span className="text-teal-600 font-semibold text-sm px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200/50">
                  Hospital
                </span>
              </div>
              <p className="text-[11px] font-medium tracking-wide uppercase text-slate-400">
                Center of Medical Excellence
              </p>
            </div>
          </NavLink>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-semibold text-slate-600">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `relative px-3.5 py-2 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "text-teal-950 bg-teal-50/80 font-bold"
                      : "hover:text-teal-900 hover:bg-slate-50"
                  }`
                }
              >
                {({ isActive }) => (
                  <span className="flex items-center gap-1.5">
                    {link.label}
                    {link.isAi && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                        <SparklesIcon className="w-2.5 h-2.5" />
                        AI
                      </span>
                    )}
                    {isActive && !link.isAi && (
                      <span className="absolute bottom-1 left-3.5 right-3.5 h-0.5 rounded-full bg-teal-700"></span>
                    )}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right Action CTA */}
          <div className="hidden sm:flex items-center gap-3">
            <NavLink
              to="/book"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-950/20 transition-all duration-200 hover:bg-teal-800 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
            >
              <CalendarIcon className="w-4 h-4 text-teal-300" />
              <span>Book Appointment</span>
            </NavLink>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <NavLink
              to="/book"
              className="rounded-lg bg-teal-900 p-2 text-white sm:hidden"
              title="Book Appointment"
            >
              <CalendarIcon className="w-5 h-5" />
            </NavLink>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <XIcon className="w-6 h-6" />
              ) : (
                <MenuIcon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-4 shadow-lg animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col gap-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      isActive
                        ? "bg-teal-50 text-teal-950"
                        : "text-slate-700 hover:bg-slate-50 hover:text-teal-900"
                    }`
                  }
                >
                  <span className="flex items-center gap-2">
                    {link.label}
                    {link.isAi && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        <SparklesIcon className="w-2.5 h-2.5" />
                        AI
                      </span>
                    )}
                  </span>
                </NavLink>
              ))}

              <div className="pt-3 mt-2 border-t border-slate-100">
                <NavLink
                  to="/book"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary w-full py-3"
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span>Book an Appointment</span>
                </NavLink>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-800">Staff Access Portals:</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-teal-800 font-medium">
                  <Link to="/admin/login" onClick={() => setMobileMenuOpen(false)}>Admin</Link>
                  <Link to="/doctor/login" onClick={() => setMobileMenuOpen(false)}>Doctor</Link>
                  <Link to="/pharmacy/login" onClick={() => setMobileMenuOpen(false)}>Pharmacy</Link>
                  <Link to="/lab/login" onClick={() => setMobileMenuOpen(false)}>Laboratory</Link>
                  <Link to="/hr/login" onClick={() => setMobileMenuOpen(false)}>HR</Link>
                  <Link to="/reception/login" onClick={() => setMobileMenuOpen(false)}>Reception</Link>
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
