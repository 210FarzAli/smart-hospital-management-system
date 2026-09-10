import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, saveSession } from "../../lib/apiClient";

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
        email,
        password,
        "pharmacist"
      );

      saveSession(token, user);
      navigate("/pharmacy/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Left branding panel */}
      <div className="hidden w-1/2 bg-teal-700 px-12 lg:flex lg:flex-col lg:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-8 text-sm font-medium text-white/90 transition hover:text-white"
          >
            ← Back to Website
          </button>

          <div className="mt-28 max-w-lg">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-100">
              Smart Hospital
            </div>

            <h1 className="mt-4 text-5xl font-bold leading-tight text-white">
              Pharmacy Portal
            </h1>

            <p className="mt-6 text-lg leading-8 text-teal-50">
              Manage medicines, pharmacy sales, customers and receipts
              from one secure workspace.
            </p>
          </div>
        </div>

        <p className="mb-8 text-sm text-teal-100/80">
          Smart Hospital Management System
        </p>
      </div>

      {/* Login area */}
      <div className="flex w-full items-center justify-center px-6 py-10 lg:w-1/2">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl sm:p-10"
        >
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mb-8 text-sm font-medium text-teal-700 hover:text-teal-900 lg:hidden"
          >
            ← Back to Website
          </button>

          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            Pharmacist Portal
          </div>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Welcome back
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to manage the hospital pharmacy.
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Email
              </label>

              <input
                type="email"
                required
                autoComplete="email"
                className="input-field mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pharmacist@hospital.local"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Password
              </label>

              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="input-field pr-20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 hover:text-teal-700"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-7 w-full"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}