import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { StaffRole } from "../lib/types";
import { useAuth } from "../hooks/useAuth";

/**
 * Guards Admin/Doctor/Pharmacist routes. Each panel has its own login page, so this
 * component redirects to the panel-specific login route on failure rather
 * than a single shared login screen.
 */
export default function ProtectedRoute({
  role,
  loginPath,
  children,
}: {
  role: StaffRole;
  loginPath: string;
  children: ReactNode;
}) {
  const { loading, staffUser } = useAuth(role);

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-slate-500">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-teal-700 border-t-transparent" />
        <span className="text-xs font-semibold tracking-wider text-teal-950 uppercase">
          Verifying Staff Session...
        </span>
      </div>
    );
  }
  if (!staffUser) {
    return <Navigate to={loginPath} replace />;
  }
  return <>{children}</>;
}
