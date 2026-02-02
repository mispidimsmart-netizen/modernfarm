import { NavLink, useLocation } from 'react-router-dom';
import { Home, Sliders, Zap, Bell, BarChart3 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAlerts } from '@/hooks/useFarmData';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, labelKey: 'home' },
  { path: '/control', icon: Sliders, labelKey: 'control' },
  { path: '/automation', icon: Zap, labelKey: 'automation' },
  { path: '/alerts', icon: Bell, labelKey: 'alerts' },
  { path: '/reports', icon: BarChart3, labelKey: 'reports' },
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
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              {showBadge && (
                <span className="absolute -right-2 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                  {unacknowledgedAlerts > 9 ? '9+' : unacknowledgedAlerts}
                </span>
              )}
            </div>
            <span className={cn(
              'text-xs font-medium',
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
