import { useEffect, ReactNode } from "react";
import { create } from "zustand";
import { apiFetch, setToken, hasToken } from "./apiClient";

export interface AuthedUser {
  ID: string;
  Email: string;
  Roles: string[];
  isProfileComplete: boolean;
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

interface AuthStore {
  user: AuthedUser | null;
  loading: boolean;
  login: (token: string, user: AuthedUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setUser: (user: AuthedUser | null) => void;
}

async function fetchFullUser(): Promise<AuthedUser | null> {
  if (!hasToken()) {
    return null;
  }
  try {
    const me = await apiFetch<MeResponse>("/auth/me");

    // Check if profile is complete by seeing if basic fields are filled
    let isProfileComplete = true;
    if (!me.Roles.includes("church_admin")) {
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

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  login: (token, user) => {
    setToken(token);
    set({ user });
  },
  logout: () => {
    setToken(null);
    set({ user: null });
    window.location.href = "/login";
  },
  refreshUser: async () => {
    const u = await fetchFullUser();
    set({ user: u });
  },
}));

// Backwards compatibility hook
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const refreshUser = useAuthStore((state) => state.refreshUser);

  return { user, loading, login, logout, refreshUser };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);

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
  }, [setUser, setLoading]);

  return <>{children}</>;
}
