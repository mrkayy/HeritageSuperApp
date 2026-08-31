import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Search } from 'lucide-react';
import { USER_ROLES, getRoleBadgeVariant } from '@/lib/constants';
import type { SystemUser } from '@/hooks/useMemberDirectory';

interface UserRolesTableProps {
  users: SystemUser[];
  filteredUsers: SystemUser[];
  userSearchTerm: string;
  onSearchChange: (value: string) => void;
  userRoleFilter: string;
  onRoleFilterChange: (value: string) => void;
  onEditRole: (user: SystemUser) => void;
}

export function UserRolesTable({
  users,
  filteredUsers,
  userSearchTerm,
  onSearchChange,
  userRoleFilter,
  onRoleFilterChange,
  onEditRole,
}: UserRolesTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>System Users & Role Management</CardTitle>
            <CardDescription>
              Update account roles and permission levels for registered users
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search user by name/email..."
                value={userSearchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={userRoleFilter} onValueChange={onRoleFilterChange}>
              <SelectTrigger className="w-48 h-9 text-sm">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {USER_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Current Role</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  {users.length === 0
                    ? 'No registered users found.'
                    : 'No users match the current search or role filter.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => {
                const userSector =
                  u.user_sector && u.user_sector.length > 0 && u.user_sector[0]?.sector
                    ? u.user_sector[0].sector.sector_name
                    : 'No Sector';
                const userTeam =
                  u.user_team && u.user_team.length > 0 && u.user_team[0]?.team
                    ? u.user_team[0].team.name
                    : 'No Team';

                return (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">
                      {`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(u.roles && u.roles.length > 0 ? u.roles : [u.role || 'member']).map((r) => (
                          <Badge key={r} variant={getRoleBadgeVariant(r)} className="capitalize text-[11px] py-0.5 px-2">
                            {r.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{userSector}</TableCell>
                    <TableCell>{userTeam}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditRole(u)}
                        className="h-8 gap-1"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit Role
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
