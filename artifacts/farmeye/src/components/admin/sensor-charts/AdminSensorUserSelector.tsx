import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Building2, User, ChevronsUpDown, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminSensorChartLabels } from '@/data/adminSensorChartLabels';
import type { AdminChartProfile } from '@/hooks/useAdminSensorAnalytics';

interface Props {
  labels: AdminSensorChartLabels;
  profiles?: AdminChartProfile[];
  selectedUserId: string;
  selectedProfile?: AdminChartProfile;
  onSelect: (id: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}

export function AdminSensorUserSelector({ labels, profiles, selectedUserId, selectedProfile, onSelect, open, setOpen }: Props) {
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between bg-gradient-to-r from-emerald-600/20 to-green-600/20 border-emerald-500/30 text-white hover:bg-emerald-500/30 hover:border-emerald-400/50 transition-all shadow-lg"
        >
          <div className="flex items-center gap-2 truncate">
            {selectedUserId === 'all' ? (
              <>
                <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-100">{labels.allFarms}</span>
              </>
            ) : selectedProfile ? (
              <>
                {selectedProfile.avatar_url ? (
                  <img src={selectedProfile.avatar_url} alt="" loading="lazy" decoding="async"
                    className="w-5 h-5 rounded-full object-cover shrink-0" />
                ) : (
                  <User className="w-4 h-4 text-gray-400 shrink-0" />
                )}
                <span className="truncate">{selectedProfile.farm_name}</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{labels.selectUser}</span>
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 bg-slate-800 border-white/10 z-50" align="end">
        <Command className="bg-slate-800">
          <CommandInput
            placeholder={labels.searchPlaceholder}
            className="h-9 bg-slate-800 text-white placeholder:text-gray-400 border-white/10"
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="py-3 text-center text-gray-400 text-sm">
              {labels.noUserFound}
            </CommandEmpty>
            <CommandGroup>
              {/* All Farms Option */}
              <CommandItem
                value="all-farms"
                onSelect={() => { onSelect('all'); setOpen(false); }}
                className="flex items-center gap-2 text-white cursor-pointer hover:bg-slate-700 aria-selected:bg-slate-700"
              >
                <Building2 className="w-4 h-4 text-purple-400" />
                <span>{labels.allFarms}</span>
                <Check className={cn('ml-auto h-4 w-4', selectedUserId === 'all' ? 'opacity-100 text-green-400' : 'opacity-0')} />
              </CommandItem>

              {/* Individual Users */}
              {profiles?.map((profile) => (
                <CommandItem
                  key={profile.id}
                  value={`${profile.farm_name} ${profile.phone || ''}`}
                  onSelect={() => { onSelect(profile.id); setOpen(false); }}
                  className="flex items-center gap-2 text-white cursor-pointer hover:bg-slate-700 aria-selected:bg-slate-700"
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" loading="lazy" decoding="async"
                      className="w-5 h-5 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center shrink-0">
                      <User className="w-3 h-3" />
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{profile.farm_name}</span>
                      <span className="text-[10px] shrink-0">{profile.farm_type === 'broiler' ? '🐔' : '🥚'}</span>
                    </div>
                    {profile.phone && <span className="text-xs text-gray-400">{profile.phone}</span>}
                  </div>
                  <Check className={cn('ml-auto h-4 w-4 shrink-0', selectedUserId === profile.id ? 'opacity-100 text-green-400' : 'opacity-0')} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
