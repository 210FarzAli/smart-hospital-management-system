import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi, saveSession } from "../../lib/apiClient";
import {
  Activity,
  ShieldCheck,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle,
} from "../../components/icons/Icons";

export default function LaboratoryLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const { token, user } = await authApi.login(
        email.trim(),
        password,
        "laboratorist"
      );
      saveSession(token, user);
      navigate("/lab/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid laboratory staff credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleDemoLaboratorist() {
    setEmail("admin@smarthospital.local");
    setPassword("Admin@123456");
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Left Branding Showcase (Desktop) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-teal-850 p-12 text-white lg:flex xl:p-16">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-950/40">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight">SMART HOSPITAL</span>
              <span className="block text-[11px] font-semibold tracking-widest text-teal-300 uppercase">
                Diagnostic Pathology Suite
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-800/80 px-3.5 py-1 text-xs font-semibold text-teal-200 ring-1 ring-teal-600/40 backdrop-blur">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Pathology & Lab Portal
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight xl:text-5xl">
            Precision Diagnostics. Timely Reports. Patient Care.
          </h1>

          <p className="text-base leading-relaxed text-teal-100">
            Manage incoming diagnostic test bookings, process in-clinic and home sample collections, record measured parameters, and release verified pathology reports.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 text-xs">
            <div className="flex items-center gap-2 text-teal-200">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>Sample Barcoding & Intake</span>
            </div>
            <div className="flex items-center gap-2 text-teal-200">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>Home Phlebotomy Dispatch</span>
            </div>
            <div className="flex items-center gap-2 text-teal-200">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>Pathology Results Entry</span>
            </div>
            <div className="flex items-center gap-2 text-teal-200">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>Instant Digital Reports</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 border-t border-teal-800/60 pt-6 text-xs text-teal-300">
          Smart Hospital Clinical System • Central Pathology Services
        </div>
      </div>

      {/* Right Login Form */}
      <div className="flex w-full items-center justify-center p-6 sm:p-12 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div>
            <div className="flex items-center gap-2 lg:hidden mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-800 text-white">
                <Activity className="h-5 w-5" />
              </div>
              <span className="text-base font-extrabold text-teal-950">SMART HOSPITAL</span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Staff Authentication
            </div>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
              Laboratory Sign In
            </h2>
            <p className="mt-1.5 text-xs text-slate-500">
              Sign in with your hospital lab technician or administrator credentials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-3.5 text-xs text-rose-800 ring-1 ring-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Email Address
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lab@smarthospital.local"
                  className="input-field pl-9"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs font-medium text-teal-800 hover:underline"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="input-field mt-1.5"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-xs font-bold shadow-md shadow-teal-950/20 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In to Laboratory Suite"}
            </button>
          </form>

          {/* Demo credential helper */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-xs space-y-2">
            <div className="font-bold text-teal-950">Demo Staff Access</div>
            <p className="text-slate-500 text-[11px]">
              Click below to fill administrator credentials (has full lab staff permissions):
            </p>
            <button
              type="button"
              onClick={handleDemoLaboratorist}
              className="w-full rounded-xl bg-slate-100 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              Autofill Staff Credentials
            </button>
          </div>

          <div className="text-center text-xs text-slate-500">
            <Link to="/" className="font-medium text-teal-800 hover:underline">
              ← Return to Hospital Website
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
