import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

export interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  roles?: string[];
  team_id?: string;
  team_name?: string;
  sector_id?: string;
  church_id?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  role: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

interface DecodedToken {
  sub: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      role: null,
      login: (user, token) => {
        try {
          const decoded = jwtDecode<DecodedToken>(token);
          set({
            user,
            token,
            isAuthenticated: true,
            role: decoded.role,
          });
        } catch (error) {
          console.error('Invalid token', error);
          // Even if token decode fails, we might still want to log them in if we trust the user object
          // But relying on token for role is safer.
          set({
            user,
            token,
            isAuthenticated: true,
            role: user.role, // Fallback to user object role
          });
        }
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, role: null });
        localStorage.removeItem('auth-storage'); // Optional: clear storage explicitly if needed
      },
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    },
  ),
);
