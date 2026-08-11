import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuthStore, User as StoreUser } from '@/store/authStore';
import { AuthenticationService } from '@/services/AuthenticationService';
import api from '@/lib/api';

export interface User {
  user_id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  roles?: string[];
  teamId?: string;
  teamName?: string;
  sector?: null;
  team?: null;
  church?: null;
  phoneNumber?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: storeUser, token, login: storeLogin, logout: storeLogout } = useAuthStore();
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async (): Promise<StoreUser | null> => {
    const currentToken = useAuthStore.getState().token;
    if (!currentToken) return null;

    try {
      const res = await api.get('/auth/me');
      const data = res.data;
      const roles: string[] = data.roles || (data.role ? [data.role] : []);
      const primaryRole = data.currentRole || (roles.length > 0 ? roles[0] : 'member');
      
      const fetchedUser: StoreUser = {
        user_id: data.id || data.user_id || '',
        email: data.email || '',
        first_name: data.first_name || data.firstName || '',
        last_name: data.last_name || data.lastName || '',
        role: primaryRole,
        team_id: data.teamId || data.team_id || '',
        team_name: data.teamName || data.team_name || '',
      };

      storeLogin(fetchedUser, currentToken);
      return fetchedUser;
    } catch (err) {
      console.error('Failed to fetch user session:', err);
      storeLogout();
      return null;
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');

    if (urlToken) {
      // Store token and clean URL
      storeLogin({ user_id: '', email: '', first_name: '', last_name: '', role: 'member' }, urlToken);
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    if (useAuthStore.getState().token) {
      fetchCurrentUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await AuthenticationService.login(email, password);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    storeLogout();
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const mappedUser: User | null = storeUser
    ? {
        user_id: storeUser.user_id,
        email: storeUser.email,
        firstName: storeUser.first_name || '',
        lastName: storeUser.last_name || '',
        name: `${storeUser.first_name || ''} ${storeUser.last_name || ''}`.trim() || storeUser.email,
        role: storeUser.role,
        teamId: storeUser.team_id || '',
        teamName: storeUser.team_name || '',
      }
    : null;

  return (
    <AuthContext.Provider value={{ user: mappedUser, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

