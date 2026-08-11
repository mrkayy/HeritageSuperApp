import api from '@/lib/api';

export class UserService {
  static async getUserByEmail(email: string): Promise<any | null> {
    try {
      const { data } = await api.get(`/users/email/${email}`);
      return data;
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      console.error(
        'Get user error:',
        axiosError.response?.data?.message || axiosError.message,
      );
      return null;
    }
  }

  static async updateUser(
    userId: string,
    updates: Record<string, any>,
  ): Promise<any | null> {
    try {
      const { data } = await api.patch(`/users/${userId}`, updates);
      return data;
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      console.error(
        'Update user error:',
        axiosError.response?.data?.message || axiosError.message,
      );
      return null;
    }
  }
}
