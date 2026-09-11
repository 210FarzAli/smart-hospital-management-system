import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi, saveSession } from "../../lib/apiClient";
import {
  Pill,
  ShieldCheck,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle,
} from "../../components/icons/Icons";

export default function PharmacistLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { token, user } = await authApi.login(
        email.trim(),
        password,
        "pharmacist"
      );
      saveSession(token, user);
      navigate("/pharmacy/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid pharmacist credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Left Branding Showcase (Desktop) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-teal-850 p-12 text-white lg:flex xl:p-16">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-950/40">
              <Pill className="h-6 w-6" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight">
                SMART HOSPITAL
              </span>
              <span className="block text-[11px] font-semibold tracking-widest text-teal-300 uppercase">
                Pharmacy POS & Inventory
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-800/80 px-3.5 py-1 text-xs font-semibold text-teal-200 ring-1 ring-teal-600/40 backdrop-blur">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Licensed Dispensary Terminal
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight xl:text-5xl">
            Precision Dispensing & POS Checkout
          </h1>

          <p className="text-base leading-relaxed text-teal-100">
            Real-time batch & expiry inventory tracking, automated reorder thresholds, digital customer ledger, and rapid point-of-sale receipt issuance.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 text-xs">
            <div className="flex items-center gap-2 text-teal-200">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>Real-Time Stock Audit</span>
            </div>
            <div className="flex items-center gap-2 text-teal-200">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>Barcode & Batch Control</span>
            </div>
            <div className="flex items-center gap-2 text-teal-200">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>Automated Low-Stock Alerts</span>
            </div>
            <div className="flex items-center gap-2 text-teal-200">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>Digital Customer Invoicing</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-teal-300">
          Smart Hospital Management System © 2026 • Pharmacy Edition
        </div>
      </div>

      {/* Right Login Form */}
      <div className="flex w-full items-center justify-center px-4 py-12 sm:px-6 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 transition-colors hover:text-teal-900"
          >
            ← Back to Public Website
          </Link>

          {/* Mobile brand header */}
          <div className="text-center lg:hidden">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-900 text-white shadow-md">
              <Pill className="h-6 w-6" />
            </div>
            <h2 className="mt-3 text-xl font-bold text-teal-950">
              Smart Hospital
            </h2>
            <p className="text-xs text-slate-500">
              Dispensary & Pharmacy Terminal
            </p>
          </div>

          <div className="card border-slate-200/80 p-8 shadow-xl shadow-slate-200/50 sm:p-10">
            <div>
              <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-bold tracking-wider text-teal-800 uppercase ring-1 ring-teal-200">
                Staff Authentication
              </span>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-teal-950">
                Pharmacist Sign In
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Enter your credentials to access the dispensary inventory & POS.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {/* Email */}
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                  Pharmacist Email Address
                </label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pharmacist@hospital.com"
                    disabled={loading}
                    className="input-field pl-10"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                  Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={loading}
                    className="input-field pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-teal-700 hover:text-teal-950"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex w-full items-center justify-center gap-2 py-3 shadow-lg shadow-teal-900/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <span>Open Pharmacy Terminal</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-4 text-center">
              <p className="text-[11px] text-slate-400">
                Authorized pharmacy dispensary personnel only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}