import api from '@/lib/api';

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  category: 'main_menu' | 'teams' | 'admin' | 'global' | string;
  isEnabled: boolean;
  allowedRoles?: string[];
  activeForUser?: boolean;
  updatedBy?: string;
  updatedAt: string;
}

export const FeatureFlagService = {
  async fetchFlags(): Promise<FeatureFlag[]> {
    const res = await api.get<FeatureFlag[]>('/feature-flags');
    return res.data;
  },

  async toggleFlag(key: string, isEnabled: boolean): Promise<FeatureFlag> {
    const res = await api.patch<FeatureFlag>(`/feature-flags/${key}`, { isEnabled });
    return res.data;
  },

  async upsertFlag(key: string, payload: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const res = await api.put<FeatureFlag>(`/feature-flags/${key}`, payload);
    return res.data;
  },
};
