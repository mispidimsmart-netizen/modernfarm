import { Power, Wifi, WifiOff, LogOut, Globe } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useProfile, useDeviceStatus } from '@/hooks/useFarmData';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

export function Header() {
  const { language, setLanguage, user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: deviceStatus } = useDeviceStatus();

  const isConnected = true; // Would come from realtime connection status

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 px-4 py-3 backdrop-blur-md pt-safe">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            deviceStatus?.power_on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}>
            <Power size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {profile?.farm_name || translations.dashboard.title[language]}
            </h1>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <span className="flex items-center gap-1 text-xs text-status-normal">
                  <Wifi size={12} />
                  {translations.status.connected[language]}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-status-danger">
                  <WifiOff size={12} />
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
