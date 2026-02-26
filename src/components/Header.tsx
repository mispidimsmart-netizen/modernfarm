import { Wifi, WifiOff, LogOut, Globe, ArrowLeft } from 'lucide-react';
import farmeyeLogo from '@/assets/farmeye-logo.png';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useProfile, useDeviceStatus } from '@/hooks/useFarmData';
import { useUserRole } from '@/hooks/useUserRole';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';

export function Header() {
  const { language, setLanguage, user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: deviceStatus } = useDeviceStatus();
  const { data: userRole } = useUserRole();
  const location = useLocation();
  const navigate = useNavigate();

  const isConnected = true; // Would come from realtime connection status
  const isHomePage = location.pathname === '/' || location.pathname === '/dashboard';

  const handleBack = () => {
    // Always navigate to home page for consistent behavior
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 px-4 py-3 backdrop-blur-md pt-safe">
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
          <div className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0 overflow-hidden">
            <img src={farmeyeLogo} alt="FarmEye" className="h-11 w-11 object-contain" />
          </div>
          <span className="font-bold text-foreground text-base">FarmEye</span>
          
          {/* Divider */}
          <div className="h-5 w-px bg-border mx-1" />
          
          {/* Farm Name & Status */}
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-medium text-foreground truncate">
              {profile?.farm_name || (language === 'bn' ? 'আমার খামার' : 'My Farm')}
            </h1>
            <div className="flex items-center gap-2">
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
