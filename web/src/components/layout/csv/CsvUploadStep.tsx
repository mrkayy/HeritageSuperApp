import React from 'react';
import { Input } from '@/components/ui/input';
import { Upload, AlertTriangle } from 'lucide-react';

interface CsvUploadStepProps {
  validationError: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function CsvUploadStep({ validationError, onFileChange }: CsvUploadStepProps) {
  const downloadTemplate = () => {
    const headers = [
      "First Name",
      "Surname",
      "Email",
      "Phone Number",
      "Gender",
      "Residential Address",
      "Occupation",
      "Date of Birth",
      "Wedding Anniversary",
      "Marital Status",
      "Stage",
      "Role"
    ];
    const sampleRow = [
      "Samuel",
      "Adebayo",
      "samuel.adebayo@example.com",
      "08012345678",
      "Male",
      "15 Adeola Odeku St, Victoria Island",
      "Software Engineer",
      "7-Nov",
      "12-Aug",
      "Married",
      "foundation_class",
      "member"
    ];
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), sampleRow.join(",")].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "heritage_members_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 py-4 flex-1 flex flex-col justify-center">
      <div className="border-2 border-dashed border-border/80 p-8 rounded-2xl text-center bg-secondary/10 hover:border-primary/50 transition-colors">
        <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-semibold text-foreground text-base">Choose a CSV to Upload</p>
        <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
          <strong>First Name</strong> (or <strong>Full Name</strong>) column is strictly required. Birthdays and anniversaries accept text (e.g. <code>7-Nov</code>) or date formats.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
          <Input
            type="file"
            accept=".csv"
            className="max-w-xs text-xs cursor-pointer"
            onChange={onFileChange}
          />
          <button
            type="button"
            onClick={downloadTemplate}
            className="text-xs text-primary hover:underline font-medium px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            📥 Download Sample CSV Template
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
  );
}
