import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileSpreadsheet, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  Trash2, 
  Plus, 
  FileText, 
  Sparkles,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { MembershipService } from '@/services/membershipService';

interface CsvPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const MEMBERSHIP_STAGES = [
  { value: 'first_time_guest', label: 'First Time Guest' },
  { value: 'foundation_class', label: 'Foundation Class' },
  { value: 'sunday_school_module_1', label: 'Sunday School 1' },
  { value: 'sunday_school_module_2', label: 'Sunday School 2' },
  { value: 'sunday_school_module_3', label: 'Sunday School 3' },
  { value: 'membership_class', label: 'Membership Class' },
  { value: 'stewardship', label: 'Stewardship' },
  { value: 'mit', label: 'Minister In Traning' },
  { value: 'resident_pastor', label: 'Resident Pastor' },
];

const USER_ROLES = [
  { value: 'member', label: 'Member' },
  { value: 'steward', label: 'Steward' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'resident_pastor', label: 'Resident Pastor' },
  { value: 'church_admin', label: 'Church Admin' },
];

export default function CsvPreviewModal({ open, onOpenChange, onSuccess }: CsvPreviewModalProps) {
  const [step, setStep] = useState<'select' | 'preview' | 'result'>('select');
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Cleaned JSON row data
  const [rows, setRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  // Reset modal state on open
  useEffect(() => {
    if (open) {
      setStep('select');
      setFile(null);
      setValidationError(null);
      setRows([]);
      setResult(null);
    }
  }, [open]);

  // Client-side CSV Parser
  const parseCSVText = (text: string): { headers: string[]; rows: string[][] } => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentVal = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentVal.trim());
        if (row.length > 0 && row.some(cell => cell !== '')) {
          lines.push(row);
        }
        row = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    if (currentVal !== '' || row.length > 0) {
      row.push(currentVal.trim());
      lines.push(row);
    }

    if (lines.length === 0) return { headers: [], rows: [] };
    return { headers: lines[0], rows: lines.slice(1) };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      setFile(selected);
      setValidationError(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsed = parseCSVText(text);

        if (parsed.headers.length === 0) {
          setValidationError("The uploaded CSV is empty.");
          return;
        }

        // Header Validation: Ensure 'First Name' or 'Full Name' is matched
        const headerLower = parsed.headers.map(h => h.toLowerCase());
        const hasFirstName = headerLower.some(h => h.includes('first name') || h === 'firstname');
        const hasFullName = headerLower.some(h => h.includes('full name') || h === 'name');

        if (!hasFirstName && !hasFullName) {
          setValidationError("Header Validation Failed: Missing required column matching 'First Name' or 'Full Name'.");
          return;
        }

        // Auto map header indices
        let firstNameIdx = -1;
        let surnameIdx = -1;
        let fullNameIdx = -1;
        let emailIdx = -1;
        let phoneIdx = -1;
        let addressIdx = -1;
        let genderIdx = -1;
        let dobIdx = -1;
        let maritalIdx = -1;
        let anniversaryIdx = -1;
        let occupationIdx = -1;
        let stageIdx = -1;
        let roleIdx = -1;

        parsed.headers.forEach((h, idx) => {
          const lower = h.toLowerCase().trim();
          if (lower.includes('first name') || lower === 'firstname') firstNameIdx = idx;
          else if (lower.includes('surname') || lower.includes('last name') || lower === 'lastname') surnameIdx = idx;
          else if (lower === 'name' || lower.includes('full name')) fullNameIdx = idx;
          else if (lower.includes('email')) emailIdx = idx;
          else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('contact')) phoneIdx = idx;
          else if (lower.includes('address') || lower.includes('location')) addressIdx = idx;
          else if (lower.includes('gender') || lower === 'sex') genderIdx = idx;
          else if (lower.includes('birth') || lower === 'dob') dobIdx = idx;
          else if (lower.includes('marital')) maritalIdx = idx;
          else if (lower.includes('anniversary') || lower.includes('wedding')) anniversaryIdx = idx;
          else if (lower.includes('occupation') || lower.includes('job')) occupationIdx = idx;
          else if (lower.includes('stage')) stageIdx = idx;
          else if (lower.includes('role')) roleIdx = idx;
        });

        // Convert parsed strings to clean initial states
        const mappedRows = parsed.rows.map((row, rowIdx) => {
          const getVal = (idx: number) => (idx !== -1 && idx < row.length ? row[idx] : '');

          let fName = getVal(firstNameIdx);
          let sName = getVal(surnameIdx);
          const fullName = getVal(fullNameIdx);

          if (!fName && !sName && fullName) {
            const parts = fullName.split(' ');
            fName = parts[0] || '';
            sName = parts.slice(1).join(' ') || '';
          } else if (!sName && fName.includes(' ')) {
            const parts = fName.split(' ');
            fName = parts[0] || '';
            sName = parts.slice(1).join(' ') || '';
          }

          const rawPhone = getVal(phoneIdx);
          let cleanPhone = rawPhone.replace(/\s+/g, '');
          if (cleanPhone.length === 10 && ['7', '8', '9'].includes(cleanPhone[0])) {
            cleanPhone = '0' + cleanPhone;
          }

          let dobVal = getVal(dobIdx);
          let annVal = getVal(anniversaryIdx);

          // Default mapping
          let stageVal = getVal(stageIdx).toLowerCase().replace(/\s+/g, '_');
          if (!MEMBERSHIP_STAGES.some(s => s.value === stageVal)) {
            stageVal = 'first_time_guest';
          }

          let roleVal = getVal(roleIdx).toLowerCase();
          if (!USER_ROLES.some(r => r.value === roleVal)) {
            roleVal = 'member';
          }

          return {
            id: `row-${rowIdx}-${Date.now()}`,
            firstName: fName,
            surname: sName,
            email: getVal(emailIdx),
            phoneNumber: cleanPhone,
            homeAddress: getVal(addressIdx),
            gender: getVal(genderIdx).toLowerCase().startsWith('f') ? 'female' : getVal(genderIdx).toLowerCase().startsWith('m') ? 'male' : '',
            jobOccupation: getVal(occupationIdx),
            currentStage: stageVal,
            role: roleVal,
            dobText: dobVal,
            annText: annVal,
          };
        });

        setRows(mappedRows);
        setStep('preview');
      };

      reader.readAsText(selected);
    }
  };

  const handleCellChange = (rowId: string, field: string, val: string) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: val } : r));
  };

  const handleDeleteRow = (rowId: string) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
  };

  const handleAddRow = () => {
    setRows(prev => [
      ...prev,
      {
        id: `added-${Date.now()}`,
        firstName: '',
        surname: '',
        email: '',
        phoneNumber: '',
        homeAddress: '',
        gender: '',
        jobOccupation: '',
        currentStage: 'first_time_guest',
        role: 'member',
        dobText: '',
        annText: '',
      }
    ]);
  };

  const parseDayMonth = (val: string): { day: number | null, month: number | null } => {
    if (!val) return { day: null, month: null };
    const monthMap: Record<string, number> = {
      jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
      apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
      aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10,
      nov: 11, november: 11, dec: 12, december: 12
    };

    // Case 1: "7-November" or "November 7"
    const reAlpha = /^\s*(\d{1,2})[\s\-\/]+([a-zA-Z]+)\s*$/;
    let match = val.match(reAlpha);
    if (match) {
      const day = parseInt(match[1]);
      const mStr = match[2].toLowerCase();
      if (monthMap[mStr]) return { day, month: monthMap[mStr] };
    }

    const reAlphaRev = /^\s*([a-zA-Z]+)[\s\-\/]+(\d{1,2})\s*$/;
    match = val.match(reAlphaRev);
    if (match) {
      const day = parseInt(match[2]);
      const mStr = match[1].toLowerCase();
      if (monthMap[mStr]) return { day, month: monthMap[mStr] };
    }

    // Case 2: "11/7"
    const reNum = /^(\d{1,2})[\/\-](\d{1,2})/;
    match = val.match(reNum);
    if (match) {
      const num1 = parseInt(match[1]);
      const num2 = parseInt(match[2]);
      if (num1 <= 31 && num2 <= 12) return { day: num1, month: num2 };
    }

    return { day: null, month: null };
  };

  const handleSubmitImport = async () => {
    const invalidRows = rows.filter(r => !r.firstName.trim());
    if (invalidRows.length > 0) {
      toast({
        title: "Validation Error",
        description: "All rows must have a First Name populated.",
        variant: "destructive"
      });
      return;
    }

    try {
      setImporting(true);

      // Structure data correctly for backend AddMemberInput
      const payload = rows.map(r => {
        const { day: dobD, month: dobM } = parseDayMonth(r.dobText);
        const { day: annD, month: annM } = parseDayMonth(r.annText);

        return {
          firstName: r.firstName,
          surname: r.surname,
          email: r.email || null,
          phoneNumber: r.phoneNumber || null,
          homeAddress: r.homeAddress || null,
          gender: r.gender || null,
          dateOfBirthDay: dobD,
          dateOfBirthMonth: dobM,
          maritalStatus: r.maritalStatus || (annD ? 'married' : null),
          weddingAnniversaryDay: annD,
          weddingAnniversaryMonth: annM,
          jobOccupation: r.jobOccupation || null,
          role: r.role,
          currentStage: r.currentStage
        };
      });

      const res = await MembershipService.bulkProfileJSON(payload);
      setResult(res);
      setStep('result');
      toast({
        title: "Bulk Profile Processed",
        description: `Successfully profiled ${res.successCount} members using concurrent backend goroutines.`,
      });
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Failed to upload members",
        description: err.response?.data?.message || err.message,
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${step === 'preview' ? 'max-w-[95vw] w-[95vw] overflow-hidden' : 'max-w-xl overflow-y-auto'} max-h-[95vh] flex flex-col p-6 rounded-2xl`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
            Bulk Profiling Portal
          </DialogTitle>
          <DialogDescription>
            Import, validate headers, preview fields, and run high-concurrency Goroutines profiling.
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4 py-4 flex-1 flex flex-col justify-center">
            <div className="border-2 border-dashed border-border/80 p-8 rounded-2xl text-center bg-secondary/10 hover:border-primary/50 transition-colors">
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-semibold text-foreground">Choose a CSV to Upload</p>
              <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">
                First Name (or Full Name) column header is strictly required. Preceding stages histories will be auto-calculated.
              </p>

              <Input 
                type="file" 
                accept=".csv" 
                className="mt-6 max-w-xs mx-auto text-xs" 
                onChange={handleFileChange}
              />
            </div>

            {validationError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Header Mapping Error:</span> {validationError}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 flex flex-col overflow-hidden py-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 font-semibold">
                  <Sparkles className="w-3 h-3 mr-1" /> Header Validation Passed
                </Badge>
                <Badge variant="secondary">{rows.length} rows loaded</Badge>
              </div>
              <Button onClick={handleAddRow} size="sm" variant="outline" className="h-8 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
              </Button>
            </div>

            {/* Scrollable Preview Grid */}
            <div className="border border-border/50 rounded-xl overflow-auto flex-1 w-full max-h-[60vh]">
              <Table className="text-xs min-w-[1300px]">
                  <TableHeader className="bg-secondary/40 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[150px]">First Name *</TableHead>
                      <TableHead className="w-[150px]">Surname</TableHead>
                      <TableHead className="w-[180px]">Email</TableHead>
                      <TableHead className="w-[130px]">Phone Number</TableHead>
                      <TableHead className="w-[100px]">Gender</TableHead>
                      <TableHead className="w-[100px]">DOB</TableHead>
                      <TableHead className="w-[100px]">Anniversary</TableHead>
                      <TableHead className="w-[160px]">Stage</TableHead>
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
                            onChange={e => handleCellChange(row.id, 'firstName', e.target.value)}
                          />
                        </TableCell>
                        {/* Surname */}
                        <TableCell>
                          <Input
                            value={row.surname}
                            className="h-8 text-xs"
                            onChange={e => handleCellChange(row.id, 'surname', e.target.value)}
                          />
                        </TableCell>
                        {/* Email */}
                        <TableCell>
                          <Input
                            value={row.email}
                            placeholder={!row.email ? 'No Email (Direct Account)' : ''}
                            className={`h-8 text-xs ${!row.email ? 'border-amber-500/30' : ''}`}
                            onChange={e => handleCellChange(row.id, 'email', e.target.value)}
                          />
                        </TableCell>
                        {/* Phone */}
                        <TableCell>
                          <Input
                            value={row.phoneNumber}
                            className="h-8 text-xs"
                            onChange={e => handleCellChange(row.id, 'phoneNumber', e.target.value)}
                          />
                        </TableCell>
                        {/* Gender */}
                        <TableCell>
                          <Select
                            value={row.gender || ''}
                            onValueChange={val => handleCellChange(row.id, 'gender', val)}
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
                        {/* DOB */}
                        <TableCell>
                          <Input
                            value={row.dobText}
                            placeholder="e.g. 7-Nov"
                            className="h-8 text-xs"
                            onChange={e => handleCellChange(row.id, 'dobText', e.target.value)}
                          />
                        </TableCell>
                        {/* Anniversary */}
                        <TableCell>
                          <Input
                            value={row.annText}
                            placeholder="e.g. 6-Nov"
                            className="h-8 text-xs"
                            onChange={e => handleCellChange(row.id, 'annText', e.target.value)}
                          />
                        </TableCell>
                        {/* Stage */}
                        <TableCell>
                          <Select
                            value={row.currentStage}
                            onValueChange={val => handleCellChange(row.id, 'currentStage', val)}
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
                            onValueChange={val => handleCellChange(row.id, 'role', val)}
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
                            onClick={() => handleDeleteRow(row.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            </div>

            <DialogFooter className="pt-4 border-t border-border/50 flex items-center justify-between sm:justify-between w-full">
              <Button type="button" variant="ghost" className="text-xs" onClick={() => setStep('select')}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Re-upload CSV
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  disabled={importing || rows.length === 0} 
                  onClick={handleSubmitImport}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {importing ? "Processing Worker pool..." : `Validate & Upload ${rows.length} Members`}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}

        {step === 'result' && result && (
          <div className="space-y-4 py-4 flex-1">
            <div className="text-center space-y-2">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-bold">Import Processing Complete</h3>
              <p className="text-xs text-muted-foreground">
                Concurrently processed {result.totalRecords} records via backend goroutines.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-semibold text-center">
                ✅ Success: {result.successCount}
              </div>
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 font-semibold text-center">
                ❌ Failure: {result.errorCount}
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="space-y-2 text-xs pt-2">
                <span className="font-semibold text-rose-600 block">Processing Errors:</span>
                <ScrollArea className="h-32 border border-border/50 rounded-xl p-3 bg-secondary/10">
                  <div className="space-y-1">
                    {result.errors.map((err: any, idx: number) => (
                      <div key={idx} className="text-muted-foreground p-1 border-b border-border/20 last:border-0">
                        {err.name}: {err.error}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <DialogFooter className="pt-6 border-t border-border/50">
              <Button className="w-full" onClick={() => onOpenChange(false)}>
                Finish
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
