import { useAuthStore } from '@/store/authStore';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Building, MapPin, Users } from 'lucide-react';
import CreateChurch from '@/components/admin/CreateChurch';
import CreateSector from '@/components/admin/CreateSector';
import CreateTeam from '@/components/admin/CreateTeam';

const AdminManagement = () => {
  const { user } = useAuthStore();

  // Redirect non-admin users
  if (user?.role !== 'church_admin' && user?.role !== 'super_admin') {
    return (
      <div className="p-4 md:p-6 page-background">
        <Card className="glass-card">
          <CardContent className="p-6 md:p-8 text-center">
            <Shield className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg md:text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-sm md:text-base text-muted-foreground">You don&apos;t have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 page-background space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          Admin Management
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">Create and manage churches, sectors, and teams</p>
      </div>

      {/* Management Tabs */}
      <Card className="glass-card">
        <CardContent className="p-4 md:p-6">
          <Tabs defaultValue="churches" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="churches" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                <Building className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Churches</span>
              </TabsTrigger>
              <TabsTrigger value="sectors" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Sectors</span>
              </TabsTrigger>
              <TabsTrigger value="teams" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                <Users className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Teams</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="churches" className="mt-4 md:mt-6">
              <CreateChurch />
            </TabsContent>

            <TabsContent value="sectors" className="mt-4 md:mt-6">
              <CreateSector />
            </TabsContent>

            <TabsContent value="teams" className="mt-4 md:mt-6">
              <CreateTeam />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminManagement;
