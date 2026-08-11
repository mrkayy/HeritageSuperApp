
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, UserCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface User {
  user_id: string;
  member_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  teams: { team_id: string; team_name: string; }[];
  sector: { sector_id: string; sector_name: string; } | null;
}

interface RawUser {
  user_id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  user_team: {
    team: {
      team_id: string;
      name: string;
    }
  }[];
  user_sector: {
    sector: {
      sector_id: string;
      sector_name: string;
    }
  }[];
}

interface Team {
  team_id: string;
  team_name: string;
}

interface Sector {
  sector_id: string;
  sector_name: string;
}

const MemberAssignment = () => {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<string>('');


  const fetchUsers = useCallback(async () => {
    if (!user?.church_id) return;

    try {
      setLoading(true);
      const { data } = await api.get('/users', {
        params: { churchId: user.church_id }
      });

      // Transform the data to match our interface
      const transformedData = (data || []).map((userData: RawUser) => ({
        user_id: userData.user_id,
        member_id: userData.member_id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        role: userData.role,
        teams: userData.user_team?.map((ut) => ({
          team_id: ut.team?.team_id || '',
          team_name: ut.team?.name || ''
        })) || [],
        sector: (userData.user_sector && userData.user_sector.length > 0 && userData.user_sector[0]?.sector) ? {
          sector_id: userData.user_sector[0]!.sector!.sector_id,
          sector_name: userData.user_sector[0]!.sector!.sector_name
        } : null,
      }));

      setUsers(transformedData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user?.church_id]);

  const fetchTeams = useCallback(async () => {
    if (!user?.church_id) return;

    try {
      const { data } = await api.get('/teams');

      const transformedTeams = (data || []).map((team: { team_id: string; name: string }) => ({
        team_id: team.team_id,
        team_name: team.name
      }));

      setTeams(transformedTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  }, [user?.church_id]);

  const fetchSectors = useCallback(async () => {
    if (!user?.church_id) return;

    try {
      const { data } = await api.get('/sectors');
      setSectors(data || []);
    } catch (error) {
      console.error('Error fetching sectors:', error);
    }
  }, [user?.church_id]);

  useEffect(() => {
    fetchUsers();
    fetchTeams();
    fetchSectors();
  }, [fetchUsers, fetchTeams, fetchSectors]);

  const handleAssignTeam = async () => {
    if (!selectedUser || !selectedUser.member_id) return;

    try {
      setLoading(true);

      const payload = {
        firstName: selectedUser.first_name,
        surname: selectedUser.last_name,
        email: selectedUser.email,
        teamId: selectedTeam || "",
        sectorId: selectedUser.sector?.sector_id || ""
      };

      await api.put(`/members/${selectedUser.member_id}`, payload);

      toast({
        title: "Success",
        description: "Team assignment updated successfully",
      });

      setIsDialogOpen(false);
      setSelectedUser(null);
      setSelectedTeam('');
      fetchUsers();
    } catch (error) {
      console.error('Error assigning team:', error);
      toast({
        title: "Error",
        description: "Failed to assign team",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSector = async () => {
    if (!selectedUser || !selectedUser.member_id) return;

    try {
      setLoading(true);

      const payload = {
        firstName: selectedUser.first_name,
        surname: selectedUser.last_name,
        email: selectedUser.email,
        teamId: (selectedUser.teams && selectedUser.teams.length > 0) ? selectedUser.teams[0].team_id : "",
        sectorId: selectedSector || ""
      };

      await api.put(`/members/${selectedUser.member_id}`, payload);

      toast({
        title: "Success",
        description: "Sector assignment updated successfully",
      });

      setIsDialogOpen(false);
      setSelectedUser(null);
      setSelectedSector('');
      fetchUsers();
    } catch (error) {
      console.error('Error assigning sector:', error);
      toast({
        title: "Error",
        description: "Failed to assign sector",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTeam = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this team assignment?')) return;

    const userObj = users.find(u => u.user_id === userId);
    if (!userObj || !userObj.member_id) return;

    try {
      setLoading(true);

      const payload = {
        firstName: userObj.first_name,
        surname: userObj.last_name,
        email: userObj.email,
        teamId: "",
        sectorId: userObj.sector?.sector_id || ""
      };

      await api.put(`/members/${userObj.member_id}`, payload);

      toast({
        title: "Success",
        description: "Team assignment removed successfully",
      });
      fetchUsers();
    } catch (error) {
      console.error('Error removing team:', error);
      toast({
        title: "Error",
        description: "Failed to remove team assignment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSector = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this sector assignment?')) return;

    const userObj = users.find(u => u.user_id === userId);
    if (!userObj || !userObj.member_id) return;

    try {
      setLoading(true);

      const payload = {
        firstName: userObj.first_name,
        surname: userObj.last_name,
        email: userObj.email,
        teamId: (userObj.teams && userObj.teams.length > 0) ? userObj.teams[0].team_id : "",
        sectorId: ""
      };

      await api.put(`/members/${userObj.member_id}`, payload);

      toast({
        title: "Success",
        description: "Sector assignment removed successfully",
      });
      fetchUsers();
    } catch (error) {
      console.error('Error removing sector:', error);
      toast({
        title: "Error",
        description: "Failed to remove sector assignment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openAssignmentDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedTeam(user.teams[0]?.team_id || '');
    setSelectedSector(user.sector?.sector_id || '');
    setIsDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            Member Assignment
          </h1>
          <p className="text-muted-foreground">Assign members to teams and sectors</p>
        </div>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign {selectedUser?.first_name} {selectedUser?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Team Assignment</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.team_id} value={team.team_id}>
                      {team.team_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAssignTeam} disabled={loading} className="w-full">
                {loading ? "Assigning..." : "Assign Team"}
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sector Assignment</label>
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Sector</SelectItem>
                  {sectors.map((sector) => (
                    <SelectItem key={sector.sector_id} value={sector.sector_id}>
                      {sector.sector_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAssignSector} disabled={loading} className="w-full">
                {loading ? "Assigning..." : "Assign Sector"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No members found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((userData) => (
                    <TableRow key={userData.user_id}>
                      <TableCell className="font-medium">
                        {userData.first_name} {userData.last_name}
                      </TableCell>
                      <TableCell>{userData.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {userData.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {userData.teams.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {userData.teams[0]?.team_name ?? ''}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveTeam(userData.user_id)}
                              className="text-red-600 hover:text-red-800 h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No Team</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {userData.sector ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {userData.sector.sector_name}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSector(userData.user_id)}
                              className="text-red-600 hover:text-red-800 h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No Sector</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAssignmentDialog(userData)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberAssignment;
