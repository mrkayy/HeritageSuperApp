import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, Search } from 'lucide-react';
import { MEMBERSHIP_STAGES, formatStage } from '@/lib/constants';
import type { MemberProfile } from '@/hooks/useMemberDirectory';

interface MemberDirectoryTableProps {
  members: MemberProfile[];
  filteredMembers: MemberProfile[];
  loading: boolean;
  memberSearchTerm: string;
  onSearchChange: (value: string) => void;
  memberStageFilter: string;
  onStageFilterChange: (value: string) => void;
  onEdit: (member: MemberProfile) => void;
  onDelete: (memberId: string) => void;
}

export function MemberDirectoryTable({
  members,
  filteredMembers,
  loading,
  memberSearchTerm,
  onSearchChange,
  memberStageFilter,
  onStageFilterChange,
  onEdit,
  onDelete,
}: MemberDirectoryTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>Profiled Members Directory</CardTitle>
            <CardDescription>
              All church members with their progression stage, local church, sector, and team assignments
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search member by name/email..."
                value={memberSearchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={memberStageFilter} onValueChange={onStageFilterChange}>
              <SelectTrigger className="w-48 h-9 text-sm">
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {MEMBERSHIP_STAGES.map((st) => (
                  <SelectItem key={st.value} value={st.value}>
                    {st.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Stage</TableHead>
                <TableHead>Local Church</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {members.length === 0
                      ? "No profiled members found. Click 'Profile New Member' to get started."
                      : 'No members match the current search or stage filter.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.name || `${member.firstName || ''} ${member.surname || ''}`.trim() || 'Unknown'}
                    </TableCell>
                    <TableCell>{member.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal text-xs">
                        {formatStage(member.currentStage)}
                      </Badge>
                    </TableCell>
                    <TableCell>{member.localChurchName || 'Default Church'}</TableCell>
                    <TableCell>{member.sectorName || 'No Sector'}</TableCell>
                    <TableCell>{member.teamName || 'No Team'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(member)}
                          title="Edit Member"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(member.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete Member"
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
  );
}
