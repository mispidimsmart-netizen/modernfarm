import { useSheds, useSelectedShed } from '@/hooks/useSheds';
import { useAuth } from '@/context/AuthContext';
import { ChevronDown, Warehouse } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect } from 'react';

export function ShedSelector() {
  const { language } = useAuth();
  const { data: sheds, isLoading } = useSheds();
  const { selectedShedId, setSelectedShedId } = useSelectedShed();

  // Auto-select first shed if none selected
  useEffect(() => {
    if (sheds && sheds.length > 0 && !selectedShedId) {
      setSelectedShedId(sheds[0].id);
    }
  }, [sheds, selectedShedId, setSelectedShedId]);

  if (isLoading) {
    return (
      <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
    );
  }

  if (!sheds || sheds.length === 0) {
    return null;
  }

  const selectedShed = sheds.find(s => s.id === selectedShedId);

  return (
    <Select value={selectedShedId || ''} onValueChange={setSelectedShedId}>
      <SelectTrigger className="h-9 w-auto min-w-[120px] gap-1.5 border-primary/20 bg-primary/5 text-sm font-medium text-primary">
        <Warehouse className="h-4 w-4" />
        <SelectValue>
          {selectedShed ? (language === 'bn' ? selectedShed.name : selectedShed.name_en) : (language === 'bn' ? 'শেড নির্বাচন' : 'Select Shed')}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {sheds.map((shed) => (
          <SelectItem key={shed.id} value={shed.id}>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${shed.is_active ? 'bg-status-normal' : 'bg-status-off'}`} />
              {language === 'bn' ? shed.name : shed.name_en}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
