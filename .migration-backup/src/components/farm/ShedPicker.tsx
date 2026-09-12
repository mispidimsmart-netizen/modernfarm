/**
 * ShedPicker (S2.4 ext) — Compact selector for which shed an entry belongs to.
 *
 * Shows ONLY when the current farm has 2+ matching sheds, so single-shed
 * farms see no extra clutter. Used in MortalitySheet (and any other
 * shed-scoped log) so multi-shed farms can attribute entries correctly
 * instead of silently using the first shed.
 */
import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useFarmType } from '@/hooks/useFarmType';
import { useSheds } from '@/hooks/useSheds';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ShedPickerProps {
  value: string | null;
  onChange: (shedId: string) => void;
  /** Override label text. */
  label?: { bn: string; en: string };
}

export function ShedPicker({ value, onChange, label }: ShedPickerProps) {
  const { language } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { isLayer, isBroiler } = useFarmType();
  const { data: sheds } = useSheds();

  const farmMode: 'layer' | 'broiler' | null = isLayer
    ? 'layer'
    : isBroiler
      ? 'broiler'
      : null;

  const eligible = useMemo(() => {
    if (!sheds || !selectedFarmId) return [];
    return sheds.filter(
      (s: any) =>
        s.farm_id === selectedFarmId &&
        (!farmMode || s.farm_type === farmMode || s.farm_type === 'both'),
    );
  }, [sheds, selectedFarmId, farmMode]);

  // Single-shed (or zero) farms don't need a picker — keep UI clean.
  if (eligible.length < 2) return null;

  const lbl = label ?? { bn: 'শেড', en: 'Shed' };
  const current = value ?? eligible[0]?.id ?? '';

  return (
    <div className="space-y-2">
      <Label>{lbl[language]}</Label>
      <Select value={current} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {eligible.map((s: any) => (
            <SelectItem key={s.id} value={s.id}>
              {language === 'bn' ? s.name : s.name_en}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default ShedPicker;
