import api from '@/lib/api';
import { useLoadingStore } from '@/store/loadingState';
import { useAuthStore } from '@/store/authStore';

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'member' | 'guest';
  team_id?: string;
  sector_id?: string;
  church_id?: string;
  otp?: string;
}

export class AuthenticationService {
  static async login(email: string, password: string) {
    const { setLoading } = useLoadingStore.getState();
    const { login } = useAuthStore.getState();

    try {
      setLoading(true);
      const response = await api.post('/auth/login', { email, password });
      const data = response.data;
      const token = data.token || data.Token || data.accessToken;
      const roles: string[] = data.Roles || data.roles || [];
      const primaryRole = roles.length > 0 ? roles[0] : (data.role || 'super_admin');

      const user = {
        user_id: data.ID || data.user_id || '',
        email: data.Email || data.email || email,
        first_name: data.first_name || data.firstName || '',
        last_name: data.last_name || data.lastName || '',
        role: primaryRole,
      };

      // Update auth store
      login(user, token);

      return user;
    } catch (error: unknown) {
      const e = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      console.error('Login failed', e);
      if ((e as { response?: unknown }).response) {
        throw new Error(e.response?.data?.message || 'Login failed');
      }
      throw new Error(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  // Register a member or guest (with or without OTP)
  static async memberRegistraton(payload: RegisterData) {
    const { setLoading } = useLoadingStore.getState();
    const { login } = useAuthStore.getState();
    try {
      setLoading(true);
      if (!payload.otp)
        throw new Error('OTP is required for member registration');

      // Step 1: Validate OTP which automatically creates the user
      const response = await api.post('/otp-invites/validate', {
        email: payload.email,
        otp: payload.otp,
      });
      const { user, accessToken } = response.data;

      // Step 2: Update the user with their chosen password, names, and assigned groups
      const updateResponse = await api.patch(`/users/${user.user_id}`, {
        first_name: payload.firstName,
        last_name: payload.lastName,
        password: payload.password,
        church_id: payload.church_id,
        sector_id: payload.sector_id,
        team_id: payload.team_id,
      });

      // Update auth store
      login(updateResponse.data, accessToken);

      return updateResponse.data;
    } catch (error: unknown) {
      const e = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      throw new Error(
        e.response?.data?.message || e.message || 'Registration failed',
      );
    } finally {
      setLoading(false);
    }
  }

  // Register a guest user with only email (no OTP, no password)
  static async registerGuest(data: RegisterData) {
    const { setLoading } = useLoadingStore.getState();
    try {
      setLoading(true);
      const { email, firstName, lastName, password } = data;
      const response = await api.post('/users', {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role: 'guest',
      });
      console.log('Guest registration response::', response.data);
      return response.data;
    } catch (error: unknown) {
      const e = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      throw new Error(
        e.response?.data?.message || e.message || 'Guest registration failed',
      );
    } finally {
      setLoading(false);
    }
  }

  static async logOut(): Promise<void> {
    const { logout } = useAuthStore.getState();
    logout();
  }

  static async getCurrentUser() {
    const { user } = useAuthStore.getState();
    return user;
  }

  static async getSession() {
    const { token, user } = useAuthStore.getState();
    if (!token) return null;
    return { access_token: token, user };
  }
}
