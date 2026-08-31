import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FeatureFlag, FeatureFlagService } from '@/services/featureFlagService';
import { useAuth } from './AuthContext';

interface FeatureFlagContextType {
  flags: Record<string, boolean>;
  flagList: FeatureFlag[];
  loading: boolean;
  isFeatureEnabled: (key: string, defaultValue?: boolean) => boolean;
  toggleFlag: (key: string, isEnabled: boolean) => Promise<void>;
  refreshFlags: () => Promise<void>;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined);

export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [flagList, setFlagList] = useState<FeatureFlag[]>([]);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const refreshFlags = useCallback(async () => {
    if (!user) {
      setFlags({});
      setFlagList([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await FeatureFlagService.fetchFlags();
      setFlagList(data);

      const map: Record<string, boolean> = {};
      data.forEach((f) => {
        // activeForUser is evaluated on the backend based on roles and enabled status
        map[f.key] = f.activeForUser !== undefined ? f.activeForUser : f.isEnabled;
      });
      setFlags(map);
    } catch (err) {
      console.error('[FeatureFlagProvider] Failed to fetch feature flags:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshFlags();
  }, [refreshFlags]);

  const isFeatureEnabled = useCallback(
    (key: string, defaultValue: boolean = true): boolean => {
      if (flags[key] !== undefined) {
        return flags[key];
      }
      return defaultValue;
    },
    [flags]
  );

  const toggleFlag = async (key: string, isEnabled: boolean) => {
    // Optimistic UI update
    setFlags((prev) => ({ ...prev, [key]: isEnabled }));
    setFlagList((prev) =>
      prev.map((f) => (f.key === key ? { ...f, isEnabled, activeForUser: isEnabled } : f))
    );

    try {
      const updated = await FeatureFlagService.toggleFlag(key, isEnabled);
      setFlagList((prev) => prev.map((f) => (f.key === key ? updated : f)));
      setFlags((prev) => ({
        ...prev,
        [key]: updated.activeForUser !== undefined ? updated.activeForUser : updated.isEnabled,
      }));
    } catch (err) {
      console.error('[FeatureFlagProvider] Failed to toggle flag:', err);
      // Revert on failure
      await refreshFlags();
      throw err;
    }
  };

  return (
    <FeatureFlagContext.Provider
      value={{
        flags,
        flagList,
        loading,
        isFeatureEnabled,
        toggleFlag,
        refreshFlags,
      }}
    >
      {children}
    </FeatureFlagContext.Provider>
  );
};

export const useFeatureFlag = (key?: string, defaultValue: boolean = true) => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlag must be used within a FeatureFlagProvider');
  }

  if (key) {
    return context.isFeatureEnabled(key, defaultValue);
  }

  return context;
};
