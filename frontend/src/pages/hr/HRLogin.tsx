import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi, saveSession } from "../../lib/apiClient";
import {
  Users,
  ShieldCheck,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle,
} from "../../components/icons/Icons";

export default function HRLogin() {
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
        "hr"
      );
      saveSession(token, user);
      navigate("/hr/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid HR staff credentials."
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
              <Users className="h-6 w-6" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight">SMART HOSPITAL</span>
              <span className="block text-[11px] font-semibold tracking-widest text-teal-300 uppercase">
                Human Resources Suite
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-800/80 px-3.5 py-1 text-xs font-semibold text-teal-200 ring-1 ring-teal-600/40 backdrop-blur">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Hospital HR & Payroll Management
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight xl:text-5xl">
            Empowering Healthcare Talent & Operations.
          </h1>

          <p className="text-base leading-relaxed text-teal-100">
            Streamline employee records, manage clinical and support staff rosters, track salary structures, and execute monthly payroll runs with complete audit transparency.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 text-xs">
            <div className="flex items-center gap-2 text-teal-200">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>Employee Directory & Records</span>
            </div>
            <div className="flex items-center gap-2 text-teal-200">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>Department Headcounts</span>
            </div>
            <div className="flex items-center gap-2 text-teal-200">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>Salary Structures & Grades</span>
            </div>
            <div className="flex items-center gap-2 text-teal-200">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>Automated Payroll Disbursement</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-teal-800/60 pt-6 text-xs text-teal-300">
          <span>Protected Staff Management Portal</span>
          <span>City Care Health System</span>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Authorized HR Staff Access
            </div>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Human Resources Portal
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Enter your corporate credentials to manage employees and payroll.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Corporate Email</label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hr@hospital.local"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-4 pl-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] font-medium text-teal-700 hover:text-teal-900"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-800 py-3 text-xs font-bold text-white shadow-md shadow-teal-950/20 hover:bg-teal-900 transition disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In to HR Suite"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

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
