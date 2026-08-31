import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart } from 'lucide-react';
import { useSouls } from '@/hooks/useSouls';
import { SoulRegistrationForm } from '@/components/souls/SoulRegistrationForm';
import { SoulsList } from '@/components/souls/SoulsList';
import { SoulDetailsModal } from '@/components/souls/SoulDetailsModal';

const SoulRegistration = () => {
  const {
    user,
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
  } = useSouls();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 md:hidden">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          Soul Registration
        </h1>
      </div>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Desktop Header */}
        <div className="hidden md:flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Heart className="h-5 w-5 md:h-6 md:w-6 text-red-500" />
              Soul Registration
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">Register and manage souls from your outreach</p>
          </div>
        </div>

        <Tabs defaultValue="register" className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="register" className="text-xs md:text-sm">Register Soul</TabsTrigger>
            <TabsTrigger value="manage" className="text-xs md:text-sm">Manage Souls</TabsTrigger>
          </TabsList>

          <TabsContent value="register">
            <SoulRegistrationForm onSuccess={fetchSouls} />
          </TabsContent>

          <TabsContent value="manage">
            <SoulsList
              filteredSouls={filteredSouls}
              loading={loading}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              getStatusColor={getStatusColor}
              handleViewSoul={handleViewSoul}
              currentUserId={user?.user_id}
            />
          </TabsContent>
        </Tabs>

        <SoulDetailsModal
          soul={selectedSoul}
          open={isViewModalOpen}
          onOpenChange={setIsViewModalOpen}
          getStatusColor={getStatusColor}
        />
      </div>
    </div>
  );
};

export default SoulRegistration;
