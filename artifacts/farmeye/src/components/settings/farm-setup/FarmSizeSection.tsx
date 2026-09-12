import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FARM_SIZES } from '@/data/farmSetupOptions';
import type { FarmSize } from '@/lib/farmSetup';

interface FarmSizeSectionProps {
  language: 'bn' | 'en';
  farmSize: FarmSize;
  onChange: (s: FarmSize) => void;
}

export function FarmSizeSection({ language, farmSize, onChange }: FarmSizeSectionProps) {
  return (
    <RadioGroup value={farmSize} onValueChange={(v) => onChange(v as FarmSize)}>
      <div className="grid grid-cols-3 gap-2">
        {FARM_SIZES.map((size) => (
          <div key={size.id}>
            <RadioGroupItem value={size.id} id={size.id} className="sr-only" />
            <Label
              htmlFor={size.id}
              className={`flex flex-col items-center justify-center rounded-xl p-3 cursor-pointer transition-all ${
                farmSize === size.id
                  ? 'bg-primary/10 border-2 border-primary text-primary'
                  : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
              }`}
            >
              <span className="font-semibold">{size.name[language]}</span>
              <span className="text-xs text-muted-foreground">{size.range[language]}</span>
            </Label>
          </div>
        ))}
      </div>
    </RadioGroup>
  );
}
