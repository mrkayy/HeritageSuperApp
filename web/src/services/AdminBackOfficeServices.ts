import api from '@/lib/api';
import { LocalChurch, Sector, Team } from '@repo/dto';
import { useLoadingStore } from '@/store/loadingState';

type AxiosError = {
  response?: { data?: { message?: string } };
  message?: string;
};

export class AdminBackOfficeServices {
  static async fetchChurches(): Promise<LocalChurch[] | null> {
    const { setLoading } = useLoadingStore.getState();

    try {
      setLoading(true);
      const { data } = await api.get('/churches');
      return data as LocalChurch[];
    } catch (error: unknown) {
      const e = error as AxiosError;
      throw new Error(
        e.response?.data?.message || e.message || 'Fetching churches failed',
      );
    } finally {
      setLoading(false);
    }
  }

  static async fetchTeams(): Promise<Team[] | null> {
    const { setLoading } = useLoadingStore.getState();

    try {
      setLoading(true);
      const { data } = await api.get('/teams');
      return data as Team[];
    } catch (error: unknown) {
      const e = error as AxiosError;
      throw new Error(
        e.response?.data?.message || e.message || 'Fetching teams failed',
      );
    } finally {
      setLoading(false);
    }
  }

  static async fetchSectors(): Promise<Sector[] | null> {
    const { setLoading } = useLoadingStore.getState();

    try {
      setLoading(true);
      const { data } = await api.get('/sectors');
      return data as Sector[];
    } catch (error: unknown) {
      const e = error as AxiosError;
      throw new Error(
        e.response?.data?.message || e.message || 'Fetching sectors failed',
      );
    } finally {
      setLoading(false);
    }
  }

  static async fetchChurchByUserId(
    user_id: string,
  ): Promise<LocalChurch[] | null> {
    const { setLoading } = useLoadingStore.getState();

    try {
      setLoading(true);
      const { data } = await api.get(`/users/${user_id}/churches`);
      return data as LocalChurch[];
    } catch (error: unknown) {
      const e = error as AxiosError;
      throw new Error(
        e.response?.data?.message ||
          e.message ||
          'Fetching church by user_id failed',
      );
    } finally {
      setLoading(false);
    }
  }
}
