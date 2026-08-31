import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { soulService, Soul } from '@/services/soulService';
import { toast } from '@/hooks/use-toast';

export function useSouls() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'saved' | 'already_saved' | 'not_saved'>('saved');
  const [souls, setSouls] = useState<Soul[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSoul, setSelectedSoul] = useState<Soul | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const fetchSouls = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await soulService.getAllSouls();
      setSouls(data || []);
    } catch (error) {
      console.error('Error fetching souls:', error);
      toast({
        title: "Error",
        description: "Failed to fetch souls",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchSouls();
    }
  }, [user, activeTab, fetchSouls]);

  const filteredSouls = useMemo(
    () =>
      souls.filter(soul =>
        soul.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        soul.phone?.includes(searchTerm) ||
        soul.address?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [souls, searchTerm],
  );

  const getStatusColor = useCallback((status: string) => {
    return status === 'saved'
      ? "bg-green-100 text-green-800"
      : "bg-yellow-100 text-yellow-800";
  }, []);

  const handleViewSoul = useCallback((soul: Soul) => {
    setSelectedSoul(soul);
    setIsViewModalOpen(true);
  }, []);

  return {
    user,
    souls,
    filteredSouls,
    loading,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    selectedSoul,
    isViewModalOpen,
    setIsViewModalOpen,
    fetchSouls,
    getStatusColor,
    handleViewSoul,
  };
}
