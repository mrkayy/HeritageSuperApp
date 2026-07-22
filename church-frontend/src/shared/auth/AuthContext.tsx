// This is the single source of truth for "who is logged in" on the
// frontend, mirroring the backend's single sign-on gate. Every feature
// reads the current user via useAuth() - none of them implement their
// own login state or call the /auth/login endpoint directly except the
// auth feature itself.
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiFetch, setToken } from "./apiClient";

export interface AuthedUser {
  ID: string;
  Email: string;
  Roles: string[];
}

interface AuthContextValue {
  user: AuthedUser | null;
  loading: boolean;
  login: (token: string, user: AuthedUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<AuthedUser>("/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
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
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
