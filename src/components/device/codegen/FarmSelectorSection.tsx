import { Home } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FarmOption, Language } from './types';

interface Props {
  language: Language;
  allFarms: FarmOption[];
  selectedFarmId: string;
  onSelect: (id: string) => void;
  deviceToken: string;
  autoLoaded: boolean;
}

/** Admin-only farm picker that drives credential auto-load. */
export function FarmSelectorSection({ language, allFarms, selectedFarmId, onSelect, deviceToken, autoLoaded }: Props) {
  return (
    <div className="space-y-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
      <div className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400">
        <Home className="h-4 w-4" />
        {language === 'bn' ? '🏠 খামার সিলেক্ট করুন' : '🏠 Select Farm'}
      </div>
      <Select value={selectedFarmId} onValueChange={onSelect}>
        <SelectTrigger>
          <SelectValue placeholder={language === 'bn' ? 'একটি খামার বেছে নিন...' : 'Choose a farm...'} />
        </SelectTrigger>
        <SelectContent>
          {allFarms.map((farm) => (
            <SelectItem key={farm.id} value={farm.id}>
              <div className="flex flex-col">
                <span>{farm.name}</span>
                {farm.owner_phone && <span className="text-xs text-muted-foreground">{farm.owner_phone}</span>}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {allFarms.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {language === 'bn' ? 'কোনো খামার পাওয়া যায়নি' : 'No farms found'}
        </p>
      )}
      {selectedFarmId && !deviceToken && autoLoaded && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          ⚠️{' '}
          {language === 'bn'
            ? 'এই খামারে কোনো ডিভাইস টোকেন নেই। প্রথমে Setup Wizard সম্পন্ন করতে হবে।'
            : 'No device token found for this farm. Setup Wizard must be completed first.'}
        </p>
      )}
    </div>
  );
}
