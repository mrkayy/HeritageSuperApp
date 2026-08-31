import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { MembershipService } from '@/services/membershipService';
import { MEMBERSHIP_STAGES, USER_ROLES } from '@/lib/constants';

export interface CsvRow {
  id: string;
  firstName: string;
  surname: string;
  email: string;
  phoneNumber: string;
  homeAddress: string;
  gender: string;
  jobOccupation: string;
  currentStage: string;
  role: string;
  dobText: string;
  annText: string;
  maritalStatus?: string;
}

export interface ImportResult {
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors?: Array<{ name: string; error: string }>;
}

export type CsvStep = 'select' | 'preview' | 'result';

function parseCSVText(text: string): { headers: string[]; rows: string[][] } {
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
}

function parseDayMonth(val: string): { day: number | null; month: number | null } {
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
}

export function useCsvImport(open: boolean, onImportComplete: () => void) {
  const [step, setStep] = useState<CsvStep>('select');
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
        const mappedRows: CsvRow[] = parsed.rows.map((row, rowIdx) => {
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
  }, []);

  const handleCellChange = useCallback((rowId: string, field: string, val: string) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: val } : r));
  }, []);

  const handleDeleteRow = useCallback((rowId: string) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
  }, []);

  const handleAddRow = useCallback(() => {
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
  }, []);

  const handleSubmitImport = useCallback(async () => {
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
      onImportComplete();
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
  }, [rows, onImportComplete]);

  return {
    step,
    setStep,
    file,
    validationError,
    rows,
    importing,
    result,
    handleFileChange,
    handleCellChange,
    handleDeleteRow,
    handleAddRow,
    handleSubmitImport,
  };
}
