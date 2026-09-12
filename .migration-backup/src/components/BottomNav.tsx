import { NavLink, useLocation } from 'react-router-dom';
import { Home, Sliders, Egg, Bell, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useAlerts } from '@/hooks/useFarmData';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/hooks/useHapticFeedback';

const navItems = [
  { path: '/', icon: Home, labelKey: 'home', emoji: '🏠' },
  { path: '/farm', icon: Egg, labelKey: 'farm', emoji: '🥚' },
  { path: '/control', icon: Sliders, labelKey: 'control', emoji: '🎛️' },
  { path: '/alerts', icon: Bell, labelKey: 'alerts', emoji: '🔔' },
  { path: '/settings', icon: Settings, labelKey: 'settings', emoji: '⚙️' },
] as const;

export function BottomNav() {
  const location = useLocation();
  const { language } = useAuth();
  const { data: alerts } = useAlerts();
  
  const unacknowledgedAlerts = alerts?.filter(a => !a.acknowledged).length ?? 0;

  const handleNavClick = () => {
    // Trigger haptic feedback on navigation
    triggerHaptic('selection');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-lg px-2 pb-safe">
      <div className="mx-auto flex max-w-md items-center justify-around py-1">
        {navItems.map(({ path, icon: Icon, labelKey, emoji }) => {
          const isActive = location.pathname === path;
          const label = translations.nav[labelKey][language];
          const showBadge = labelKey === 'alerts' && unacknowledgedAlerts > 0;

          return (
            <NavLink
              key={path}
              to={path}
              onClick={handleNavClick}
              className="relative flex flex-1 flex-col items-center justify-center py-2 px-1 min-w-0"
            >
              {/* Active indicator pill */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-2xl bg-primary/10"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              
              <div className="relative z-10 flex flex-col items-center gap-0.5">
                {/* Icon with badge */}
                <div className="relative">
                  <motion.div
                    animate={{ scale: isActive ? 1.1 : 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <Icon 
                      size={22} 
                      strokeWidth={isActive ? 2.5 : 1.8}
                      className={cn(
                        'transition-colors',
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                  </motion.div>
                  
                  {showBadge && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white shadow-sm"
                    >
                      {unacknowledgedAlerts > 9 ? '9+' : unacknowledgedAlerts}
                    </motion.span>
                  )}
                </div>
                
                {/* Label */}
                <span className={cn(
                  'text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {label}
                </span>
              </div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
