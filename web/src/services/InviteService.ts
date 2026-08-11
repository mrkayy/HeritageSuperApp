import api from '@/lib/api';

type CreateInvitePayload = {
  email: string;
  role: string;
  expires_at?: string;
  created_by_user_id?: string;
  church_id?: string;
  sector_id?: string;
};

export class InviteService {
  static async createInvite(payload: CreateInvitePayload): Promise<any> {
    try {
      const { data } = await api.post('/otp-invites/invite', payload);
      return data;
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      console.error(
        'Create invite error:',
        axiosError.response?.data?.message || axiosError.message,
      );
      throw new Error(
        axiosError.response?.data?.message || 'Failed to create invite',
      );
    }
  }

  static async resendInvite(email: string): Promise<any> {
    try {
      const { data } = await api.put('/otp-invites/resend', { email });
      return data;
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      console.error(
        'Resend invite error:',
        axiosError.response?.data?.message || axiosError.message,
      );
      throw new Error(
        axiosError.response?.data?.message || 'Failed to resend invite',
      );
    }
  }
}
