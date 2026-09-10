import { useEffect, useState } from "react";
import { authApi, clearSession, getStoredUser, type AuthUser } from "../lib/apiClient";

interface AuthState {
  loading: boolean;
  staffUser: AuthUser | null;
}

/**
 * Resolves the signed-in staff user from the JWT stored in localStorage at
 * login. Used by both the Admin panel and the Doctor panel — each has its
 * own login route, but they share this same resolution logic.
 */
export function useAuth(requiredRole?: string) {
  const [state, setState] = useState<AuthState>({ loading: true, staffUser: null });

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const cached = getStoredUser();
      if (!cached) {
        if (isMounted) setState({ loading: false, staffUser: null });
        return;
      }
      try {
        // Confirm the token is still valid against the backend.
        const { user } = await authApi.me();
        if (isMounted) {
          setState({
            loading: false,
            staffUser: !requiredRole || user.role === requiredRole ? user : null,
          });
        }
      } catch {
        clearSession();
        if (isMounted) setState({ loading: false, staffUser: null });
      }
    }

    load();
    return () => { isMounted = false; };
  }, [requiredRole]);

  function signOut() {
    clearSession();
    window.location.reload();
  }

  return { ...state, signOut };
}
