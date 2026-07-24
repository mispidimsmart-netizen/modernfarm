import { useState, useMemo } from 'react';
import { Wifi, WifiOff, LogOut, Globe, ArrowLeft, Building2, Crown, Shield, ChevronDown, Check, Search } from 'lucide-react';
import farmeyeLogo from '@/assets/farmeye-logo-new-gen.png';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useProfile, useDeviceStatus } from '@/hooks/useFarmData';
import { useAllDeviceHealth } from '@/hooks/useDeviceHealth';
import { useUserRole } from '@/hooks/useUserRole';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { useFarmContext } from '@/context/FarmContext';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AlertBell } from '@/components/AlertBell';

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

export function Header() {
  const { language, setLanguage, user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: deviceStatus } = useDeviceStatus();
  const { data: deviceHealth } = useAllDeviceHealth();
  const { data: userRole } = useUserRole();
  const { data: platformRole } = usePlatformRole();
  const primaryOrg = platformRole?.orgs?.[0];
  const orgClickable = !!primaryOrg && (primaryOrg.my_role === 'org_owner' || primaryOrg.my_role === 'org_admin');
  const { farms, currentFarm, setSelectedFarmId, selectedFarmId } = useFarmContext();
  const location = useLocation();
  const navigate = useNavigate();
  // S1.4 — search input only when farmer manages many farms (≥6).
  const [farmSearch, setFarmSearch] = useState('');
  const showFarmSearch = farms.length > 5;
  const filteredFarms = useMemo(() => {
    if (!farmSearch.trim()) return farms;
    const q = farmSearch.toLowerCase().trim();
    return farms.filter(f =>
      f.name?.toLowerCase().includes(q) || f.name_en?.toLowerCase().includes(q)
    );
  }, [farms, farmSearch]);

  const isConnected = (deviceHealth || []).some((d) => {
    if (!d.is_online || !d.last_seen_at) return false;
    return Date.now() - new Date(d.last_seen_at).getTime() < ONLINE_THRESHOLD_MS;
  });
  const isHomePage = location.pathname === '/' || location.pathname === '/dashboard';
  const farmDisplayName =
    (currentFarm && (language === 'bn' ? currentFarm.name : currentFarm.name_en)) ||
    profile?.farm_name ||
    (language === 'bn' ? 'আমার খামার' : 'My Farm');
  const hasMultipleFarms = farms.length > 1;

  const handleBack = () => {
    // Always navigate to home page for consistent behavior
    navigate('/');
  };

  return (
    <header className="sticky top-7 z-40 border-b bg-card/95 px-4 py-3 backdrop-blur-md pt-safe">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Back button - show on non-home pages */}
          {!isHomePage && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              aria-label={language === 'bn' ? 'হোমে ফিরে যান' : 'Back to home'}
              className="h-9 w-9 shrink-0"
            >
              <ArrowLeft size={20} />
            </Button>
          )}
          
          {/* FarmEye Logo & Name */}
          <div className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0 overflow-hidden border-2 border-border bg-white">
            <img src={farmeyeLogo} alt="FarmEye" decoding="async" className="h-9 w-9 object-contain" />
          </div>
          <span className="font-bold text-foreground text-base">FarmEye</span>
          
          {/* Divider */}
          <div className="h-5 w-px bg-border mx-1" />
          
          {/* Farm Name & Status */}
          <div className="min-w-0 flex-1">
            {hasMultipleFarms ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="group flex items-center gap-1 rounded-md px-1 -mx-1 hover:bg-accent transition-colors max-w-full"
                    aria-label={language === 'bn' ? 'খামার পরিবর্তন' : 'Switch farm'}
                  >
                    <h1 className="text-sm font-medium text-foreground truncate">
                      {farmDisplayName}
                    </h1>
                    <ChevronDown size={14} className="text-muted-foreground flex-shrink-0 group-hover:text-foreground transition-colors" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 max-h-[60vh] overflow-y-auto">
                  <DropdownMenuLabel className="text-xs">
                    {language === 'bn' ? 'খামার নির্বাচন' : 'Switch farm'}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {showFarmSearch && (
                    <div className="sticky top-0 z-10 bg-popover px-2 pb-2">
                      <div className="relative">
                        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="search"
                          value={farmSearch}
                          onChange={e => setFarmSearch(e.target.value)}
                          onKeyDown={e => e.stopPropagation()}
                          placeholder={language === 'bn' ? 'খামার খুঁজুন...' : 'Search farms...'}
                          aria-label={language === 'bn' ? 'খামার খুঁজুন' : 'Search farms'}
                          className="w-full rounded-md border border-input bg-background pl-7 pr-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                      </div>
                    </div>
                  )}
                  {filteredFarms.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                      {language === 'bn' ? 'কোনো খামার পাওয়া যায়নি' : 'No farms found'}
                    </div>
                  ) : (
                    filteredFarms.map(f => (
                      <DropdownMenuItem
                        key={f.id}
                        onSelect={() => { setSelectedFarmId(f.id); setFarmSearch(''); }}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate">
                          {language === 'bn' ? f.name : f.name_en}
                        </span>
                        {f.id === selectedFarmId && (
                          <Check size={14} className="text-primary flex-shrink-0" />
                        )}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <h1 className="text-sm font-medium text-foreground truncate">
                {farmDisplayName}
              </h1>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {primaryOrg && (
                <button
                  type="button"
                  onClick={() => orgClickable && navigate('/org-admin')}
                  disabled={!orgClickable}
                  className={cn(
                    'flex items-center gap-1 rounded-full border px-1.5 py-0 text-[10px] font-medium leading-none h-[18px] transition-colors',
                    'border-primary/30 bg-primary/10 text-primary',
                    orgClickable && 'hover:bg-primary/20 cursor-pointer',
                    !orgClickable && 'cursor-default opacity-90'
                  )}
                  title={primaryOrg.name}
                >
                  {primaryOrg.my_role === 'org_owner' ? (
                    <Crown size={10} />
                  ) : primaryOrg.my_role === 'org_admin' ? (
                    <Shield size={10} />
                  ) : (
                    <Building2 size={10} />
                  )}
                  <span className="max-w-[110px] truncate">{primaryOrg.name}</span>
                </button>
              )}
              {userRole?.role === 'worker' && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {language === 'bn' ? 'কর্মী' : 'Worker'}
                </Badge>
              )}
              {isConnected ? (
                <span className="flex items-center gap-1 text-[10px] text-status-normal">
                  <Wifi size={10} />
                  {translations.status.connected[language]}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-status-danger">
                  <WifiOff size={10} />
                  {translations.status.disconnected[language]}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <AlertBell />
          <ThemeToggle />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
            className="flex items-center gap-1 text-xs"
          >
            <Globe size={14} />
            {language === 'bn' ? 'EN' : 'বাং'}
          </Button>
          
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-muted-foreground"
            >
              <LogOut size={18} />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
