import { useState } from 'react';
import { Activity, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { HealthLabels } from './labels';
import type { HealthProfile } from './useSystemHealthData';

interface Props {
  labels: HealthLabels;
  profiles?: HealthProfile[];
  selectedUserId: string;
  onSelect: (userId: string) => void;
}

/** Combobox that scopes the health dashboard to all users or one farm. */
export function HealthUserSelector({ labels, profiles, selectedUserId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const selectedUser = profiles?.find((p) => p.id === selectedUserId);

  return (
    <div className="flex items-center gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full sm:w-[350px] justify-between bg-gradient-to-r from-slate-900 to-slate-800 border-cyan-500/30 text-white hover:bg-slate-800 hover:border-cyan-400/50 shadow-lg shadow-cyan-500/10 transition-all"
          >
            <div className="flex items-center gap-2 truncate">
              {selectedUserId === 'all' ? (
                <>
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="font-medium">{labels.allUsers}</span>
                </>
              ) : selectedUser ? (
                <>
                  <Avatar className="h-6 w-6 border border-cyan-500/30">
                    <AvatarImage src={selectedUser.avatar_url || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-[10px] text-white">
                      {selectedUser.farm_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate font-medium">{selectedUser.farm_name}</span>
                </>
              ) : (
                <span>{labels.selectUser}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[350px] p-0 bg-gradient-to-b from-slate-900 to-slate-800 border-cyan-500/30 shadow-xl shadow-cyan-500/10"
          align="start"
        >
          <Command className="bg-transparent">
            <CommandInput
              placeholder={labels.searchPlaceholder}
              className="text-white placeholder:text-cyan-300/50 border-cyan-500/20"
            />
            <CommandList>
              <CommandEmpty className="text-cyan-300/60 py-4 text-center">{labels.noUserFound}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all-users"
                  onSelect={() => {
                    onSelect('all');
                    setOpen(false);
                  }}
                  className="text-white hover:bg-cyan-500/20 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mr-2">
                    <Activity className="h-3.5 w-3.5 text-white" />
                  </div>
                  {labels.allUsers}
                  <Check
                    className={cn('ml-auto h-4 w-4', selectedUserId === 'all' ? 'opacity-100 text-cyan-400' : 'opacity-0')}
                  />
                </CommandItem>
                {profiles?.map((profile) => (
                  <CommandItem
                    key={profile.id}
                    value={`${profile.farm_name} ${profile.phone || ''}`}
                    onSelect={() => {
                      onSelect(profile.id);
                      setOpen(false);
                    }}
                    className="text-white hover:bg-cyan-500/20 cursor-pointer"
                  >
                    <Avatar className="h-6 w-6 mr-2 border border-cyan-500/30">
                      <AvatarImage src={profile.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-[10px] text-white">
                        {profile.farm_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="truncate">{profile.farm_name}</span>
                      {profile.phone && <span className="text-xs text-cyan-300/60">{profile.phone}</span>}
                    </div>
                    <Check
                      className={cn(
                        'ml-auto h-4 w-4',
                        selectedUserId === profile.id ? 'opacity-100 text-cyan-400' : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
