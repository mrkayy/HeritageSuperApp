import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  FileSpreadsheet, 
  ArrowLeft, 
  Upload, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';
import { useVisitorCsvImport, VisitorCsvRow } from '@/hooks/useVisitorCsvImport';

interface VisitorCsvPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export default function VisitorCsvPreviewModal({
  open,
  onOpenChange,
  onImportComplete,
}: VisitorCsvPreviewModalProps) {
  const {
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
  } = useVisitorCsvImport(open, onImportComplete);

  const downloadVisitorTemplate = () => {
    const headers = [
      "First Name",
      "Last Name",
      "Phone Number",
      "Gender",
      "Residential Address",
      "Email Address",
      "Who Invited You",
      "Prayer Request",
      "Notes"
    ];
    const sampleRow = [
      "Samuel",
      "Adebayo",
      "08012345678",
      "Male",
      "15 Adeola Odeku St, Victoria Island, Lagos",
      "samuel@example.com",
      "Sister Grace",
      "Wisdom and spiritual growth",
      "First visit to Sunday second service"
    ];
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), sampleRow.join(",")].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "heritage_first_timers_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${step === 'preview' ? 'max-w-[95vw] w-[95vw] overflow-hidden' : 'max-w-xl overflow-y-auto'} max-h-[95vh] flex flex-col p-6 rounded-2xl`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FileSpreadsheet className="w-6 h-6 text-primary" />
            Bulk First-Timer Intake Portal
          </DialogTitle>
          <DialogDescription>
            Import, validate, preview, and ingest first-time church visitors in bulk with automated attendance logging.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload Step */}
        {step === 'select' && (
          <div className="space-y-4 py-4 flex-1 flex flex-col justify-center">
            <div className="border-2 border-dashed border-border/80 p-8 rounded-2xl text-center bg-secondary/10 hover:border-primary/50 transition-colors">
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-semibold text-foreground text-base">Choose a Visitor CSV to Upload</p>
              <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
                <strong>First Name</strong>, <strong>Last Name</strong>, and <strong>Phone Number</strong> are required. Today&apos;s attendance will be automatically logged.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                <Input
                  type="file"
                  accept=".csv"
                  className="max-w-xs text-xs cursor-pointer"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={downloadVisitorTemplate}
                  className="text-xs text-primary hover:underline font-medium px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
                >
                  📥 Download First-Timers Template
                </button>
              </div>
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

        {/* Step 2: Interactive In-Browser Live Preview */}
        {step === 'preview' && (
          <div className="flex-1 flex flex-col overflow-hidden py-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 font-semibold">
                  <Sparkles className="w-3 h-3 mr-1" /> Header Validation Passed
                </Badge>
                <Badge variant="secondary">{rows.length} visitors loaded</Badge>
              </div>
              <Button onClick={handleAddRow} size="sm" variant="outline" className="h-8 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Visitor Row
              </Button>
            </div>

            <div className="border border-border/50 rounded-xl overflow-auto flex-1 w-full max-h-[60vh]">
              <Table className="text-xs min-w-[1450px]">
                <TableHeader className="bg-secondary/40 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[140px]">First Name *</TableHead>
                    <TableHead className="w-[140px]">Last Name *</TableHead>
                    <TableHead className="w-[130px]">Phone Number *</TableHead>
                    <TableHead className="w-[100px]">Gender</TableHead>
                    <TableHead className="w-[180px]">Residential Address</TableHead>
                    <TableHead className="w-[160px]">Email Address</TableHead>
                    <TableHead className="w-[140px]">Who Invited You?</TableHead>
                    <TableHead className="w-[200px]">Prayer Request</TableHead>
                    <TableHead className="w-[180px]">Worker Notes</TableHead>
                    <TableHead className="w-[50px] text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row: VisitorCsvRow) => (
                    <TableRow key={row.id} className="hover:bg-secondary/10">
                      {/* First Name */}
                      <TableCell>
                        <Input
                          value={row.firstName}
                          className={`h-8 text-xs ${!row.firstName.trim() ? 'border-rose-500/50 focus:border-rose-500' : ''}`}
                          onChange={e => handleCellChange(row.id, 'firstName', e.target.value)}
                        />
                      </TableCell>
                      {/* Last Name */}
                      <TableCell>
                        <Input
                          value={row.lastName}
                          className={`h-8 text-xs ${!row.lastName.trim() ? 'border-rose-500/50 focus:border-rose-500' : ''}`}
                          onChange={e => handleCellChange(row.id, 'lastName', e.target.value)}
                        />
                      </TableCell>
                      {/* Phone */}
                      <TableCell>
                        <Input
                          value={row.phoneNumber}
                          className={`h-8 text-xs ${!row.phoneNumber.trim() ? 'border-rose-500/50 focus:border-rose-500' : ''}`}
                          onChange={e => handleCellChange(row.id, 'phoneNumber', e.target.value)}
                        />
                      </TableCell>
                      {/* Gender */}
                      <TableCell>
                        <Select
                          value={row.gender || 'male'}
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
                      {/* Address */}
                      <TableCell>
                        <Input
                          value={row.address}
                          placeholder="e.g. Ikeja, Lagos"
                          className="h-8 text-xs"
                          onChange={e => handleCellChange(row.id, 'address', e.target.value)}
                        />
                      </TableCell>
                      {/* Email */}
                      <TableCell>
                        <Input
                          value={row.email}
                          placeholder="Optional"
                          className="h-8 text-xs"
                          onChange={e => handleCellChange(row.id, 'email', e.target.value)}
                        />
                      </TableCell>
                      {/* Invited By */}
                      <TableCell>
                        <Input
                          value={row.invitedByText}
                          placeholder="e.g. Sister Mary"
                          className="h-8 text-xs"
                          onChange={e => handleCellChange(row.id, 'invitedByText', e.target.value)}
                        />
                      </TableCell>
                      {/* Prayer Request */}
                      <TableCell>
                        <Input
                          value={row.prayerRequest}
                          placeholder="e.g. Healing, Career"
                          className="h-8 text-xs"
                          onChange={e => handleCellChange(row.id, 'prayerRequest', e.target.value)}
                        />
                      </TableCell>
                      {/* Notes */}
                      <TableCell>
                        <Input
                          value={row.notes}
                          placeholder="e.g. 2nd Service"
                          className="h-8 text-xs"
                          onChange={e => handleCellChange(row.id, 'notes', e.target.value)}
                        />
                      </TableCell>
                      {/* Delete */}
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {importing ? "Processing Worker pool..." : `Validate & Ingest ${rows.length} Visitors`}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Result Summary */}
        {step === 'result' && result && (
          <div className="space-y-5 py-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-card border border-border/50 text-center">
                <span className="text-xs text-muted-foreground block">Total Records</span>
                <span className="text-2xl font-bold text-foreground">{result.totalRecords}</span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <span className="text-xs text-emerald-600 font-medium block flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Successfully Ingested
                </span>
                <span className="text-2xl font-bold text-emerald-600">{result.successCount}</span>
              </div>
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                <span className="text-xs text-rose-600 font-medium block flex items-center justify-center gap-1">
                  <XCircle className="w-3 h-3" /> Errors
                </span>
                <span className="text-2xl font-bold text-rose-600">{result.errorCount}</span>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-foreground">Error Details:</h4>
                <div className="max-h-40 overflow-y-auto border border-border/50 rounded-xl divide-y divide-border/50">
                  {result.errors.map((err, idx) => (
                    <div key={idx} className="p-2.5 text-xs flex justify-between items-center bg-rose-500/5">
                      <span className="font-medium text-foreground">Row {err.row}: {err.name || 'Unnamed'}</span>
                      <span className="text-rose-600">{err.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
