import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { Invite } from '@/hooks/useInvites';
import type { LocalChurch as Church } from '@/integrations/type_def';

interface InviteTableProps {
  invites: Invite[];
  loading: boolean;
  onDelete: (inviteId: string) => void;
  onUpdateStatus: (inviteId: string, used: boolean) => void;
  churches: Church[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  churchFilter: string;
  onChurchFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

function getRoleBadge(role: string) {
  const roleColors: Record<string, string> = {
    super_admin: 'bg-red-100 text-red-800',
    church_admin: 'bg-purple-100 text-purple-800',
    team_lead: 'bg-blue-100 text-blue-800',
    member: 'bg-green-100 text-green-800',
    guest: 'bg-gray-100 text-gray-800',
  };

  return (
    <Badge className={roleColors[role] || 'bg-gray-100 text-gray-800'}>
      {role.replace('_', ' ').toUpperCase()}
    </Badge>
  );
}

function getStatusBadge(invite: Invite) {
  if (invite.used) {
    return <Badge className="bg-green-100 text-green-800">USED</Badge>;
  } else if (new Date(invite.expires_at || '') < new Date()) {
    return <Badge className="bg-red-100 text-red-800">EXPIRED</Badge>;
  } else {
    return <Badge className="bg-yellow-100 text-yellow-800">UNUSED</Badge>;
  }
}

export function InviteTable({
  invites,
  loading,
  onDelete,
  onUpdateStatus,
  churches,
  searchTerm,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  churchFilter,
  onChurchFilterChange,
  statusFilter,
  onStatusFilterChange,
}: InviteTableProps) {
  return (
    <>
      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or invite code..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={onRoleFilterChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="church_admin">Church Admin</SelectItem>
                <SelectItem value="team_lead">Team Lead</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>
            <Select value={churchFilter} onValueChange={onChurchFilterChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by church" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Churches</SelectItem>
                {churches.map((church) => (
                  <SelectItem key={church.church_id} value={church.church_id}>
                    {church.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="used">Used</SelectItem>
                <SelectItem value="unused">Unused</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invites Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Invites ({invites.length})</CardTitle>
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
                  <TableHead>Invite Code</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Used By</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires At</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No invites found
                    </TableCell>
                  </TableRow>
                ) : (
                  invites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.otp_code}</TableCell>
                      <TableCell className="font-medium">
                        {invite.email}
                      </TableCell>
                      <TableCell>
                        {invite.used_by_user_id?.first_name}{' '}
                        {invite.used_by_user_id?.last_name}
                      </TableCell>
                      <TableCell>{getRoleBadge(invite.role)}</TableCell>
                      <TableCell>{getStatusBadge(invite)}</TableCell>
                      <TableCell>
                        {new Date(invite.expires_at || '').toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {invite.created_by_user_id?.first_name}{' '}
                        {invite.created_by_user_id?.last_name}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {!invite.used &&
                            new Date(invite.expires_at || '') > new Date() && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  onUpdateStatus(invite.id, true)
                                }
                              >
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </Button>
                            )}
                          {invite.used && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                onUpdateStatus(invite.id, false)
                              }
                            >
                              <XCircle className="h-4 w-4 text-yellow-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(invite.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
