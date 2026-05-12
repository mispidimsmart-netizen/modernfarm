import { Wifi, WifiOff, LogOut, Globe, ArrowLeft, Building2, Crown, Shield, ChevronDown, Check } from 'lucide-react';
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
              className="h-9 w-9 shrink-0"
            >
              <ArrowLeft size={20} />
            </Button>
          )}
          
          {/* FarmEye Logo & Name */}
          <div className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0 overflow-hidden border-2 border-border bg-white">
            <img src={farmeyeLogo} alt="FarmEye" className="h-9 w-9 object-contain" />
          </div>
          <span className="font-bold text-foreground text-base">FarmEye</span>
          
          {/* Divider */}
          <div className="h-5 w-px bg-border mx-1" />
          
          {/* Farm Name & Status */}
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-medium text-foreground truncate">
              {profile?.farm_name || (language === 'bn' ? 'আমার খামার' : 'My Farm')}
            </h1>
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
