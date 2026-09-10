import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, saveSession } from "../../lib/apiClient";

export default function AdminLogin() {
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
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      // Admin login explicitly requests admin access.
      const { token, user } = await authApi.login(
        email.trim(),
        password,
        "admin"
      );

      saveSession(token, user);

      navigate("/admin/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">

        {/* Left branding panel */}
        <div className="hidden w-1/2 bg-teal-950 lg:flex">
          <div className="flex w-full flex-col justify-between p-12 xl:p-16">

            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-bold text-teal-900">
                  +
                </div>

                <div>
                  <p className="text-lg font-bold text-white">
                    Smart Hospital
                  </p>

                  <p className="text-xs text-teal-200">
                    Management System
                  </p>
                </div>
              </div>
            </div>

            <div className="max-w-lg">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-teal-300">
                Admin Portal
              </p>

              <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
                Everything your
                <span className="block text-teal-300">
                  hospital team needs.
                </span>
              </h1>

              <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
                Secure access for hospital administration
                and management.
              </p>
            </div>

            <p className="text-sm text-teal-200">
              Smart Hospital Management System
            </p>
          </div>
        </div>

        {/* Login panel */}
        <div className="flex w-full items-center justify-center px-6 py-10 lg:w-1/2">
          <div className="w-full max-w-md">

            {/* Back button */}
            <button
              type="button"
              onClick={handleBack}
              className="mb-6 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-teal-800"
            >
              <span className="text-lg leading-none">
                ←
              </span>
              Back to Website
            </button>

            {/* Mobile branding */}
            <div className="mb-8 text-center lg:hidden">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-900 text-xl font-bold text-white">
                +
              </div>

              <h1 className="mt-3 text-xl font-bold text-teal-950">
                Smart Hospital
              </h1>

              <p className="text-sm text-slate-500">
                Management System
              </p>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/70 sm:p-10">

              <div className="mb-8">
                <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-800">
                  Admin Portal
                </span>

                <h2 className="mt-4 text-3xl font-bold text-slate-900">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in with your hospital administrator account.
                </p>
              </div>

              <form onSubmit={handleSubmit}>

                {/* Email */}
                <div>
                  <label
                    htmlFor="admin-email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email address
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      @
                    </span>

                    <input
                      id="admin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your hospital email"
                      autoComplete="username"
                      disabled={loading}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="mt-5">
                  <label
                    htmlFor="admin-password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      ●
                    </span>

                    <input
                      id="admin-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      disabled={loading}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-20 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((current) => !current)
                      }
                      disabled={loading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                    <p className="text-sm font-medium text-red-700">
                      {error}
                    </p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-7 flex w-full items-center justify-center rounded-xl bg-teal-900 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/10 transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>

              <div className="mt-8 border-t border-slate-100 pt-6 text-center">
                <p className="text-xs leading-5 text-slate-400">
                  Authorized hospital administrators only.
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              Smart Hospital Management System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}