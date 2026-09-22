import { Delete } from 'lucide-react';

interface PinKeypadProps {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export default function PinKeypad({ value, onChange, maxLength = 6 }: PinKeypadProps) {
  const handleKey = (key: string) => {
    if (key === 'del') {
      onChange(value.slice(0, -1));
    } else if (key !== '' && value.length < maxLength) {
      onChange(value + key);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Dot indicators */}
      <div className="flex gap-3">
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              i < value.length
                ? 'bg-primary border-primary scale-110'
                : 'bg-transparent border-muted-foreground/40'
            }`}
          />
        ))}
      </div>

      {/* Numeric grid */}
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key, idx) => {
          if (key === '') {
            return <div key={idx} />;
          }
          if (key === 'del') {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleKey('del')}
                className="w-16 h-16 rounded-2xl bg-muted hover:bg-muted/80 active:scale-95 transition-all flex items-center justify-center text-foreground"
              >
                <Delete className="w-5 h-5" />
              </button>
            );
          }
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleKey(key)}
              className="w-16 h-16 rounded-2xl bg-card border border-border hover:bg-primary/10 active:scale-95 active:bg-primary/20 transition-all text-xl font-semibold text-foreground shadow-sm"
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
