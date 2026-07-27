// This is the single source of truth for "who is logged in" on the
// frontend, mirroring the backend's single sign-on gate. Every feature
// reads the current user via useAuth() - none of them implement their
// own login state or call the /auth/login endpoint directly except the
// auth feature itself.
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { apiFetch, setToken, hasToken } from "./apiClient";

export interface AuthedUser {
  ID: string;
  Email: string;
  Roles: string[];
  isProfileComplete: boolean;
}

interface AuthContextValue {
  user: AuthedUser | null;
  loading: boolean;
  login: (token: string, user: AuthedUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

interface MeResponse {
  ID: string;
  Email: string;
  Roles: string[];
}

interface ProfileResponse {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  teamId?: string;
  sectorId?: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchFullUser(): Promise<AuthedUser | null> {
  if (!hasToken()) {
    return null;
  }
  try {
    const me = await apiFetch<MeResponse>("/auth/me");

    // Check if profile is complete by seeing if basic fields are filled
    let isProfileComplete = true;
    try {
      const profile = await apiFetch<ProfileResponse>("/profile/me");
      isProfileComplete = !!(
        profile.firstName &&
        profile.lastName &&
        profile.phoneNumber &&
        profile.address
      );
    } catch {
      isProfileComplete = false;
    }

    return {
      ID: me.ID,
      Email: me.Email,
      Roles: me.Roles,
      isProfileComplete,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthedUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const u = await fetchFullUser();
    setUser(u);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      setToken(urlToken);
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    fetchFullUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  function login(token: string, u: AuthedUser) {
    setToken(token);
    setUser(u);
  }

  function logout() {
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
