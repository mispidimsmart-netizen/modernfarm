import { NavLink, useLocation } from 'react-router-dom';
import { Home, Sliders, Egg, Bell, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAlerts } from '@/hooks/useFarmData';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, labelKey: 'home' },
  { path: '/farm', icon: Egg, labelKey: 'farm' },
  { path: '/control', icon: Sliders, labelKey: 'control' },
  { path: '/alerts', icon: Bell, labelKey: 'alerts' },
  { path: '/settings', icon: Settings, labelKey: 'settings' },
] as const;

export function BottomNav() {
  const location = useLocation();
  const { language } = useAuth();
  const { data: alerts } = useAlerts();
  
  const unacknowledgedAlerts = alerts?.filter(a => !a.acknowledged).length ?? 0;

  return (
    <nav className="bottom-nav">
      {navItems.map(({ path, icon: Icon, labelKey }) => {
        const isActive = location.pathname === path;
        const label = translations.nav[labelKey][language];
        const showBadge = labelKey === 'alerts' && unacknowledgedAlerts > 0;

        return (
          <NavLink
            key={path}
            to={path}
            className={cn('nav-item relative', isActive && 'nav-item-active')}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              {showBadge && (
                <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                  {unacknowledgedAlerts > 9 ? '9+' : unacknowledgedAlerts}
                </span>
              )}
            </div>
            <span className={cn(
              'text-[10px] font-medium',
              isActive && 'font-semibold'
            )}>
              {label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
