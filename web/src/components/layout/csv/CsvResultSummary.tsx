import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogFooter } from '@/components/ui/dialog';
import { CheckCircle } from 'lucide-react';
import type { ImportResult } from '@/hooks/useCsvImport';

interface CsvResultSummaryProps {
  result: ImportResult;
  onClose: () => void;
}

export default function CsvResultSummary({ result, onClose }: CsvResultSummaryProps) {
  return (
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
          Success: {result.successCount}
        </div>
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 font-semibold text-center">
          Failure: {result.errorCount}
        </div>
      </div>

      {result.errors && result.errors.length > 0 && (
        <div className="space-y-2 text-xs pt-2">
          <span className="font-semibold text-rose-600 block">Processing Errors:</span>
          <ScrollArea className="h-32 border border-border/50 rounded-xl p-3 bg-secondary/10">
            <div className="space-y-1">
              {result.errors.map((err, idx) => (
                <div key={idx} className="text-muted-foreground p-1 border-b border-border/20 last:border-0">
                  {err.name}: {err.error}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <DialogFooter className="pt-6 border-t border-border/50">
        <Button className="w-full" onClick={onClose}>
          Finish
        </Button>
      </DialogFooter>
    </div>
  );
}
