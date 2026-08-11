import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface NumberSettingProps {
  label: string;
  value: number;
  unit?: string;
  step?: string;
  onChange: (value: number) => void;
}

export function NumberSetting({ label, value, unit, step, onChange }: NumberSettingProps) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 h-9 text-center"
        />
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

interface SwitchSettingProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function SwitchSetting({ label, checked, onChange }: SwitchSettingProps) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
