import React from 'react';
import { Member } from '@/services/membershipService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Search,
  Pencil,
  Trash2,
  Cake,
  Heart,
  Filter,
  Phone,
  Mail,
  Briefcase,
} from 'lucide-react';
import { MEMBERSHIP_STAGES, formatStage, formatMonthName } from '@/lib/constants';

interface MemberCRMTableProps {
  members: Member[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  stageFilter: string;
  setStageFilter: (value: string) => void;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}

export function MemberCRMTable({
  members,
  loading,
  searchTerm,
  setSearchTerm,
  stageFilter,
  setStageFilter,
  onEdit,
  onDelete,
}: MemberCRMTableProps) {
  return (
    <>
      {/* Filter Bar */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto items-center">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Stage:
              </span>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {MEMBERSHIP_STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Member Table */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/50 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Members Directory ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="font-semibold">Member Name</TableHead>
                  <TableHead className="font-semibold">Current Stage</TableHead>
                  <TableHead className="font-semibold">Birthday (DOB)</TableHead>
                  <TableHead className="font-semibold">Wedding Anniversary</TableHead>
                  <TableHead className="font-semibold">Contact Info</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading members...
                    </TableCell>
                  </TableRow>
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No members found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => {
                    const monthName = formatMonthName(member.dateOfBirthMonth);
                    const annMonthName = formatMonthName(member.weddingAnniversaryMonth);
                    return (
                      <TableRow key={member.id} className="hover:bg-secondary/40">
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground flex items-center gap-2">
                              {member.firstName} {member.surname}
                              {member.role && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] capitalize px-1.5 py-0"
                                >
                                  {member.role.replace(/_/g, ' ')}
                                </Badge>
                              )}
                            </div>
                            {member.jobOccupation && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Briefcase className="w-3 h-3" /> {member.jobOccupation}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal text-xs">
                            {formatStage(member.currentStage)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {member.dateOfBirthDay && monthName ? (
                            <div className="flex items-center gap-1.5 text-xs text-pink-600 dark:text-pink-400 font-medium">
                              <Cake className="w-3.5 h-3.5 flex-shrink-0" />
                              {member.dateOfBirthDay} {monthName}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Not specified
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {member.weddingAnniversaryDay && annMonthName ? (
                            <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                              <Heart className="w-3.5 h-3.5 flex-shrink-0" />
                              {member.weddingAnniversaryDay} {annMonthName}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Not specified
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5 text-xs">
                            {member.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="w-3 h-3 text-muted-foreground" /> {member.email}
                              </div>
                            )}
                            {member.phoneNumber && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="w-3 h-3 text-muted-foreground" />{' '}
                                {member.phoneNumber}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => onEdit(member)}
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => onDelete(member)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
