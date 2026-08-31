import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Sparkles } from 'lucide-react';
import { MEMBERSHIP_STAGES, USER_ROLES } from '@/lib/constants';
import type { CsvRow } from '@/hooks/useCsvImport';

interface CsvPreviewTableProps {
  rows: CsvRow[];
  onCellChange: (rowId: string, field: string, val: string) => void;
  onDeleteRow: (rowId: string) => void;
  onAddRow: () => void;
}

export default function CsvPreviewTable({
  rows,
  onCellChange,
  onDeleteRow,
  onAddRow,
}: CsvPreviewTableProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 font-semibold">
            <Sparkles className="w-3 h-3 mr-1" /> Header Validation Passed
          </Badge>
          <Badge variant="secondary">{rows.length} rows loaded</Badge>
        </div>
        <Button onClick={onAddRow} size="sm" variant="outline" className="h-8 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
        </Button>
      </div>

      {/* Scrollable Preview Grid */}
      <div className="border border-border/50 rounded-xl overflow-auto flex-1 w-full max-h-[60vh]">
        <Table className="text-xs min-w-[1550px]">
            <TableHeader className="bg-secondary/40 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[140px]">First Name *</TableHead>
                <TableHead className="w-[140px]">Surname</TableHead>
                <TableHead className="w-[170px]">Email</TableHead>
                <TableHead className="w-[130px]">Phone Number</TableHead>
                <TableHead className="w-[100px]">Gender</TableHead>
                <TableHead className="w-[180px]">Address</TableHead>
                <TableHead className="w-[130px]">Occupation</TableHead>
                <TableHead className="w-[90px]">DOB</TableHead>
                <TableHead className="w-[90px]">Anniversary</TableHead>
                <TableHead className="w-[150px]">Stage</TableHead>
                <TableHead className="w-[130px]">Role</TableHead>
                <TableHead className="w-[50px] text-center"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-secondary/10">
                  {/* First Name */}
                  <TableCell>
                    <Input
                      value={row.firstName}
                      className={`h-8 text-xs ${!row.firstName.trim() ? 'border-rose-500/50 focus:border-rose-500' : ''}`}
                      onChange={e => onCellChange(row.id, 'firstName', e.target.value)}
                    />
                  </TableCell>
                  {/* Surname */}
                  <TableCell>
                    <Input
                      value={row.surname}
                      className="h-8 text-xs"
                      onChange={e => onCellChange(row.id, 'surname', e.target.value)}
                    />
                  </TableCell>
                  {/* Email */}
                  <TableCell>
                    <Input
                      value={row.email}
                      placeholder={!row.email ? 'No Email' : ''}
                      className={`h-8 text-xs ${!row.email ? 'border-amber-500/30' : ''}`}
                      onChange={e => onCellChange(row.id, 'email', e.target.value)}
                    />
                  </TableCell>
                  {/* Phone */}
                  <TableCell>
                    <Input
                      value={row.phoneNumber}
                      className="h-8 text-xs"
                      onChange={e => onCellChange(row.id, 'phoneNumber', e.target.value)}
                    />
                  </TableCell>
                  {/* Gender */}
                  <TableCell>
                    <Select
                      value={row.gender || ''}
                      onValueChange={val => onCellChange(row.id, 'gender', val)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {/* Address */}
                  <TableCell>
                    <Input
                      value={row.homeAddress}
                      placeholder="e.g. Ikeja, Lagos"
                      className="h-8 text-xs"
                      onChange={e => onCellChange(row.id, 'homeAddress', e.target.value)}
                    />
                  </TableCell>
                  {/* Occupation */}
                  <TableCell>
                    <Input
                      value={row.jobOccupation}
                      placeholder="e.g. Accountant"
                      className="h-8 text-xs"
                      onChange={e => onCellChange(row.id, 'jobOccupation', e.target.value)}
                    />
                  </TableCell>
                  {/* DOB */}
                  <TableCell>
                    <Input
                      value={row.dobText}
                      placeholder="e.g. 7-Nov"
                      className="h-8 text-xs"
                      onChange={e => onCellChange(row.id, 'dobText', e.target.value)}
                    />
                  </TableCell>
                  {/* Anniversary */}
                  <TableCell>
                    <Input
                      value={row.annText}
                      placeholder="e.g. 6-Nov"
                      className="h-8 text-xs"
                      onChange={e => onCellChange(row.id, 'annText', e.target.value)}
                    />
                  </TableCell>
                  {/* Stage */}
                  <TableCell>
                    <Select
                      value={row.currentStage}
                      onValueChange={val => onCellChange(row.id, 'currentStage', val)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEMBERSHIP_STAGES.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {/* Role */}
                  <TableCell>
                    <Select
                      value={row.role}
                      onValueChange={val => onCellChange(row.id, 'role', val)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {/* Delete Row */}
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                      onClick={() => onDeleteRow(row.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </div>
    </>
  );
}
