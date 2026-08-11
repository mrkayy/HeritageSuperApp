import api from '@/lib/api';
import { useLoadingStore } from '@/store/loadingState';

type AxiosError = {
  response?: { data?: { message?: string } };
  message?: string;
};

export class AdminBackOfficeServices {
  static async fetchChurches(): Promise<any[] | null> {
    const { setLoading } = useLoadingStore.getState();

    try {
      setLoading(true);
      const { data } = await api.get('/churches');
      return data;
    } catch (error: unknown) {
      const e = error as AxiosError;
      throw new Error(
        e.response?.data?.message || e.message || 'Fetching churches failed',
      );
    } finally {
      setLoading(false);
    }
  }

  static async fetchTeams(): Promise<any[] | null> {
    const { setLoading } = useLoadingStore.getState();

    try {
      setLoading(true);
      const { data } = await api.get('/teams');
      return data;
    } catch (error: unknown) {
      const e = error as AxiosError;
      throw new Error(
        e.response?.data?.message || e.message || 'Fetching teams failed',
      );
    } finally {
      setLoading(false);
    }
  }

  static async fetchSectors(): Promise<any[] | null> {
    const { setLoading } = useLoadingStore.getState();

    try {
      setLoading(true);
      const { data } = await api.get('/sectors');
      return data;
    } catch (error: unknown) {
      const e = error as AxiosError;
      throw new Error(
        e.response?.data?.message || e.message || 'Fetching sectors failed',
      );
    } finally {
      setLoading(false);
    }
  }

  static async fetchChurchesById(id: string): Promise<any | null> {
    const { setLoading } = useLoadingStore.getState();

    try {
      setLoading(true);
      const { data } = await api.get(`/churches/${id}`);
      return data;
    } catch (error: unknown) {
      const e = error as AxiosError;
      throw new Error(
        e.response?.data?.message ||
          e.message ||
          'Fetching church failed',
      );
    } finally {
      setLoading(false);
    }
  }
}
