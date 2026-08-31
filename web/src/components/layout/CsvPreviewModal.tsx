import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { useCsvImport } from '@/hooks/useCsvImport';
import CsvUploadStep from '@/components/layout/csv/CsvUploadStep';
import CsvPreviewTable from '@/components/layout/csv/CsvPreviewTable';
import CsvResultSummary from '@/components/layout/csv/CsvResultSummary';

interface CsvPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export default function CsvPreviewModal({ open, onOpenChange, onImportComplete }: CsvPreviewModalProps) {
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
  } = useCsvImport(open, onImportComplete);

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
          <CsvUploadStep
            validationError={validationError}
            onFileChange={handleFileChange}
          />
        )}

        {step === 'preview' && (
          <div className="flex-1 flex flex-col overflow-hidden py-2 space-y-4">
            <CsvPreviewTable
              rows={rows}
              onCellChange={handleCellChange}
              onDeleteRow={handleDeleteRow}
              onAddRow={handleAddRow}
            />

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
          <CsvResultSummary
            result={result}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
