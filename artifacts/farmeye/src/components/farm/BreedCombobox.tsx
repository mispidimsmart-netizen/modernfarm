import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/context/AuthContext';

export interface BreedOption {
  value: string;
  label: string;
  /** Extra search keywords (Bengali + English aliases) */
  keywords?: string;
}

interface BreedComboboxProps {
  options: BreedOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function BreedCombobox({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: BreedComboboxProps) {
  const { language } = useAuth();
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  const t = {
    placeholder:
      placeholder ||
      (language === 'bn' ? 'জাত নির্বাচন করুন...' : 'Select breed...'),
    search: language === 'bn' ? 'জাত খুঁজুন...' : 'Search breed...',
    empty:
      language === 'bn'
        ? 'কোনো জাত পাওয়া যায়নি'
        : 'No breed found',
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between h-10 font-normal',
            !selected && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">
            {selected ? selected.label : t.placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width] min-w-[280px]"
        align="start"
        side="bottom"
        sideOffset={4}
        style={{ maxHeight: 'min(350px, var(--radix-popover-content-available-height, 350px))' }}
      >
        <Command
          filter={(itemValue, search) => {
            const opt = options.find((o) => o.value === itemValue);
            if (!opt) return 0;
            const haystack =
              `${opt.label} ${opt.value} ${opt.keywords || ''}`.toLowerCase();
            return haystack.includes(search.toLowerCase().trim()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={t.search} />

          <CommandList className="max-h-[250px] overflow-y-auto">
            <CommandEmpty>{t.empty}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setOpen(false);
                  }}
                  className="cursor-pointer py-3"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === opt.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="text-sm">{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
