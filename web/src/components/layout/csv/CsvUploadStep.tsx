import React from 'react';
import { Input } from '@/components/ui/input';
import { Upload, AlertTriangle } from 'lucide-react';

interface CsvUploadStepProps {
  validationError: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function CsvUploadStep({ validationError, onFileChange }: CsvUploadStepProps) {
  return (
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
          onChange={onFileChange}
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
  );
}
