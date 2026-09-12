import { Link } from "react-router-dom";
import {
  HeartPulseIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  ClockIcon,
  ShieldCheckIcon,
} from "./icons/Icons";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-teal-900/60 bg-gradient-to-b from-teal-950 via-slate-950 to-teal-950 text-slate-300">
      {/* Top emergency highlight ribbon */}
      <div className="border-b border-teal-900/40 bg-teal-900/20 py-4 px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <span className="font-bold text-white uppercase tracking-wider">
              Emergency Services & Trauma Center:
            </span>
            <span className="text-teal-200 font-medium">Open 24 Hours • Rapid Triage</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">Ambulance Hotline:</span>
            <a
              href="tel:021111227391"
              className="font-bold text-rose-400 hover:text-rose-300 transition-colors"
            >
              +92 (21) 111-CARE-911
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Col 1: About & Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-800 text-white shadow-md shadow-teal-950/40">
                <HeartPulseIcon className="w-6 h-6 text-teal-300" />
              </div>
              <div>
                <div className="text-lg font-bold text-white tracking-tight">
                  City Care Hospital
                </div>
                <p className="text-[11px] font-medium tracking-wide uppercase text-teal-400">
                  Center of Excellence
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-400">
              Providing patient-first healthcare with world-class consultants,
              state-of-the-art diagnostic facilities, and accessible care for every family.
            </p>

            <div className="flex items-center gap-2 pt-2 text-xs text-teal-300 font-medium">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
              <span>Certified Healthcare Quality Standard</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Patient Services
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-300">
              <li>
                <Link to="/book" className="hover:text-teal-300 transition-colors">
                  Book an Appointment
                </Link>
              </li>
              <li>
                <Link to="/doctors" className="hover:text-teal-300 transition-colors">
                  Find a Doctor / Specialist
                </Link>
              </li>
              <li>
                <Link to="/departments" className="hover:text-teal-300 transition-colors">
                  Medical Departments
                </Link>
              </li>
              <li>
                <Link to="/laboratory" className="hover:text-teal-300 transition-colors">
                  Diagnostic Laboratory & Reports
                </Link>
              </li>
              <li>
                <Link to="/pharmacy-shop" className="hover:text-teal-300 transition-colors">
                  Online Pharmacy Store
                </Link>
              </li>
              <li>
                <Link to="/assistant" className="hover:text-teal-300 transition-colors">
                  AI Health Assistant (24/7)
                </Link>
              </li>
              <li>
                <Link to="/reviews" className="hover:text-teal-300 transition-colors">
                  Patient Reviews & Feedback
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact & Timings */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Contact & Hours
            </h3>
            <ul className="mt-4 space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <MapPinIcon className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                <span>Main Healthcare Blvd, Medical District, Karachi, Pakistan</span>
              </li>
              <li className="flex items-center gap-2.5">
                <PhoneIcon className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <a href="tel:021111227391" className="hover:text-teal-300">
                  +92 (21) 111-CARE (2273)
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MailIcon className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <a href="mailto:info@citycarehospital.local" className="hover:text-teal-300">
                  info@citycarehospital.local
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <ClockIcon className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <span>OPD: 08:00 AM – 10:00 PM (Daily)</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Staff Portals */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Staff Portals
            </h3>
            <p className="mt-2 text-xs text-slate-400">
              Authorized clinical and management team access:
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <Link
                to="/admin/login"
                className="flex items-center justify-between rounded-xl border border-teal-900/60 bg-teal-950/60 px-3.5 py-2.5 text-xs font-semibold text-teal-200 transition hover:bg-teal-900/50 hover:text-white"
              >
                <span>Hospital Administrator</span>
                <span className="text-[10px] text-teal-400 font-mono">/admin</span>
              </Link>
              <Link
                to="/doctor/login"
                className="flex items-center justify-between rounded-xl border border-teal-900/60 bg-teal-950/60 px-3.5 py-2.5 text-xs font-semibold text-teal-200 transition hover:bg-teal-900/50 hover:text-white"
              >
                <span>Consultant Doctor</span>
                <span className="text-[10px] text-teal-400 font-mono">/doctor</span>
              </Link>
              <Link
                to="/pharmacy/login"
                className="flex items-center justify-between rounded-xl border border-teal-900/60 bg-teal-950/60 px-3.5 py-2.5 text-xs font-semibold text-teal-200 transition hover:bg-teal-900/50 hover:text-white"
              >
                <span>Pharmacy Specialist</span>
                <span className="text-[10px] text-teal-400 font-mono">/pharmacy</span>
              </Link>
              <Link
                to="/lab/login"
                className="flex items-center justify-between rounded-xl border border-teal-900/60 bg-teal-950/60 px-3.5 py-2.5 text-xs font-semibold text-teal-200 transition hover:bg-teal-900/50 hover:text-white"
              >
                <span>Laboratory Specialist</span>
                <span className="text-[10px] text-teal-400 font-mono">/lab</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom copyright & disclaimer */}
        <div className="mt-12 flex flex-col gap-4 border-t border-teal-900/50 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} City Care Hospital. All rights reserved.
          </p>
          <p className="text-slate-400">
            No account required for patients • Instant booking verification
          </p>
        </div>
      </div>
    </footer>
  );
}