/**
 * CriticalAlertBanner — Top-of-screen full-width banner for danger alerts
 *
 * Appears ONLY when at least one unacknowledged danger-level smart alert exists.
 * Sticky just below the OperationsHealthStrip. Hidden on auth/public routes.
 *
 * Actions:
 *  - Tap card / "View" → /alerts
 *  - Hold-to-acknowledge (1s) → marks the top alert acknowledged
 */

import { memo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import useSmartAlerts from '@/hooks/useSmartAlerts';
import { useAcknowledgeAlert } from '@/hooks/useFarmData';
import { HoldToConfirmButton } from '@/components/ui/hold-to-confirm-button';
import { cn } from '@/lib/utils';

const HIDDEN_ROUTES = ['/login', '/reset-password', '/org-signup'];

export const CriticalAlertBanner = memo(function CriticalAlertBanner() {
  const { user, language } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { activeAlerts } = useSmartAlerts();
  const ack = useAcknowledgeAlert();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  if (!user) return null;
  if (HIDDEN_ROUTES.some(r => location.pathname.startsWith(r))) return null;

  const dangerAlerts = activeAlerts.filter(
    a => a.level === 'danger' && !dismissedIds.has(a.id) && !a.id.startsWith('synthetic_')
  );
  const top = dangerAlerts[0];
  if (!top) return null;

  const extra = dangerAlerts.length - 1;
  const title = language === 'bn' ? top.titleBn : top.title;
  const suggestion = language === 'bn' ? top.suggestionBn : top.suggestion;

  const handleAck = () => {
    setDismissedIds(prev => new Set(prev).add(top.id));
    ack.mutate(top.id);
  };

  return (
    <AnimatePresence>
      <motion.div
        key={top.id}
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="sticky top-[28px] z-40 w-full bg-red-600 text-white shadow-lg"
        role="alert"
        aria-live="assertive"
      >
        <div className="mx-auto flex max-w-screen-md items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/20 animate-pulse">
            <ShieldAlert size={20} />
          </div>

          <button
            type="button"
            onClick={() => navigate('/alerts')}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                {language === 'bn' ? 'জরুরি' : 'Critical'}
              </span>
              {extra > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                  +{extra}
                </span>
              )}
            </div>
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="truncate text-xs opacity-90">{suggestion}</p>
          </button>

          <div className="flex flex-shrink-0 items-center gap-2">
            <HoldToConfirmButton
              onConfirm={handleAck}
              holdMs={1000}
              variant="warning"
              className={cn(
                'h-9 rounded-md bg-white/15 px-3 text-xs font-medium text-white',
                'hover:bg-white/25 border-white/30'
              )}
              label={language === 'bn' ? 'ধরে রাখুন' : 'Hold'}
              activeLabel={language === 'bn' ? 'গ্রহণ করছি…' : 'Acknowledging…'}
            />
            <button
              type="button"
              onClick={() => navigate('/alerts')}
              className="hidden sm:flex items-center gap-1 rounded-md bg-white/15 px-3 py-2 text-xs font-medium hover:bg-white/25"
              aria-label={language === 'bn' ? 'বিস্তারিত' : 'View'}
            >
              {language === 'bn' ? 'দেখুন' : 'View'}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

export default CriticalAlertBanner;
