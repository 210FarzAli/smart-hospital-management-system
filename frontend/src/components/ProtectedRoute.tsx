import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { StaffRole } from "../lib/types";
import { useAuth } from "../hooks/useAuth";

/**
 * Guards Admin/Doctor routes. Each panel has its own login page, so this
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
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading...</div>;
  }
  if (!staffUser) {
    return <Navigate to={loginPath} replace />;
  }
  return <>{children}</>;
}
