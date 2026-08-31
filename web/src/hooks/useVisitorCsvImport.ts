import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { InfoCenterService, BulkVisitorImportResult } from '@/services/infoCenterService';

export interface VisitorCsvRow {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  gender: string;
  address: string;
  email: string;
  invitedByText: string;
  prayerRequest: string;
  notes: string;
}

export type VisitorCsvStep = 'select' | 'preview' | 'result';

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

export function useVisitorCsvImport(open: boolean, onImportComplete: () => void) {
  const [step, setStep] = useState<VisitorCsvStep>('select');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [rows, setRows] = useState<VisitorCsvRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkVisitorImportResult | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('select');
      setValidationError(null);
      setRows([]);
      setResult(null);
    }
  }, [open]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
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
        const headerLower = parsed.headers.map(h => h.toLowerCase().trim());
        const hasFirstName = headerLower.some(h => h.includes('first name') || h === 'firstname');
        const hasFullName = headerLower.some(h => h.includes('full name') || h === 'name');

        if (!hasFirstName && !hasFullName) {
          setValidationError("Header Validation Failed: Missing required column matching 'First Name' or 'Full Name'.");
          return;
        }

        let firstNameIdx = -1;
        let lastNameIdx = -1;
        let fullNameIdx = -1;
        let phoneIdx = -1;
        let genderIdx = -1;
        let addressIdx = -1;
        let emailIdx = -1;
        let invitedByIdx = -1;
        let prayerIdx = -1;
        let notesIdx = -1;

        parsed.headers.forEach((h, idx) => {
          const lower = h.toLowerCase().trim();
          if (lower.includes('first name') || lower === 'firstname') firstNameIdx = idx;
          else if (lower.includes('surname') || lower.includes('last name') || lower === 'lastname') lastNameIdx = idx;
          else if (lower === 'name' || lower.includes('full name')) fullNameIdx = idx;
          else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('contact')) phoneIdx = idx;
          else if (lower.includes('gender') || lower === 'sex') genderIdx = idx;
          else if (lower.includes('address') || lower.includes('location') || lower.includes('residence')) addressIdx = idx;
          else if (lower.includes('email')) emailIdx = idx;
          else if (lower.includes('invited') || lower.includes('who invited') || lower.includes('inviter')) invitedByIdx = idx;
          else if (lower.includes('prayer') || lower.includes('request')) prayerIdx = idx;
          else if (lower.includes('note') || lower.includes('comment')) notesIdx = idx;
        });

        const mappedRows: VisitorCsvRow[] = parsed.rows.map((row, rowIdx) => {
          const getVal = (idx: number) => (idx !== -1 && idx < row.length ? row[idx] : '');

          let fName = getVal(firstNameIdx);
          let lName = getVal(lastNameIdx);
          const fullName = getVal(fullNameIdx);

          if (!fName && !lName && fullName) {
            const parts = fullName.split(' ');
            fName = parts[0] || '';
            lName = parts.slice(1).join(' ') || '';
          } else if (!lName && fName.includes(' ')) {
            const parts = fName.split(' ');
            fName = parts[0] || '';
            lName = parts.slice(1).join(' ') || '';
          }

          const rawPhone = getVal(phoneIdx);
          let cleanPhone = rawPhone.replace(/\s+/g, '');
          if (cleanPhone.length === 10 && ['7', '8', '9'].includes(cleanPhone[0])) {
            cleanPhone = '0' + cleanPhone;
          }

          let rawGender = getVal(genderIdx).toLowerCase();
          let genderVal = 'male';
          if (rawGender.startsWith('f') || rawGender === 'female') {
            genderVal = 'female';
          }

          return {
            id: `row-${rowIdx}-${Date.now()}`,
            firstName: fName,
            lastName: lName,
            phoneNumber: cleanPhone,
            gender: genderVal,
            address: getVal(addressIdx),
            email: getVal(emailIdx),
            invitedByText: getVal(invitedByIdx),
            prayerRequest: getVal(prayerIdx),
            notes: getVal(notesIdx),
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
        lastName: '',
        phoneNumber: '',
        gender: 'male',
        address: '',
        email: '',
        invitedByText: '',
        prayerRequest: '',
        notes: '',
      }
    ]);
  }, []);

  const handleSubmitImport = useCallback(async () => {
    const invalidRows = rows.filter(r => !r.firstName.trim() || !r.lastName.trim() || !r.phoneNumber.trim());
    if (invalidRows.length > 0) {
      toast({
        title: "Validation Error",
        description: "All visitor rows must have First Name, Last Name, and Phone Number populated.",
        variant: "destructive"
      });
      return;
    }

    try {
      setImporting(true);

      const payload = rows.map(r => ({
        first_name: r.firstName.trim(),
        last_name: r.lastName.trim(),
        phone_number: r.phoneNumber.trim(),
        gender: r.gender || 'male',
        address: r.address.trim() || 'Not Specified',
        email: r.email.trim() || undefined,
        invited_by_text: r.invitedByText.trim() || undefined,
        prayer_request: r.prayerRequest.trim() || undefined,
        notes: r.notes.trim() || undefined,
      }));

      const res = await InfoCenterService.bulkImportVisitors(payload);
      setResult(res);
      setStep('result');
      toast({
        title: "Bulk Visitor Intake Complete",
        description: `Successfully registered and marked attendance for ${res.successCount} visitors.`,
      });
      onImportComplete();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Failed to upload visitors",
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
