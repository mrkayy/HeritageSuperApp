import { useRef } from 'react';
import { Camera, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoUploadProps {
  previewUrl?: string;
  onSelect: (file: File) => void;
  onSkip: () => void;
}

export default function PhotoUpload({ previewUrl, onSelect, onSkip }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSelect(file);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-32 h-32 rounded-full border-2 border-dashed border-primary/40 bg-muted/30 hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center overflow-hidden relative group"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Profile preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
            <User className="w-10 h-10" />
            <Camera className="w-4 h-4" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
          <Camera className="w-6 h-6 text-white" />
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />

      <div className="flex flex-col items-center gap-1 text-center">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          {previewUrl ? 'Change Photo' : 'Upload Photo'}
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline mt-1"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
