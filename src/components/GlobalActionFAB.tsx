/**
 * GlobalActionFAB — Unified expandable floating action button.
 *
 * Replaces the standalone VoiceCommandFAB with a single FAB that fans out
 * three operational quick-actions:
 *   - Voice command (toggle Bengali speech recognition)
 *   - Emergency (jump to /alerts for fast triage)
 *   - Call worker (tel: link from profile.phone, falls back to toast)
 *
 * Hidden on auth/public routes and when no user is signed in. Bottom-right,
 * tucked above the BottomNav.
 */

import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Plus, X, Phone, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useFarmData';
import { useVoiceCommands, type VoiceCommand } from '@/hooks/useVoiceCommands';
import { cn } from '@/lib/utils';

const HIDDEN_ROUTES = ['/login', '/reset-password', '/org-signup'];

export function GlobalActionFAB() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: profile } = useProfile();
  const [open, setOpen] = useState(false);

  const lang = (auth?.language ?? 'bn') as 'bn' | 'en';
  const t = (bn: string, en: string) => (lang === 'bn' ? bn : en);

  const commands: VoiceCommand[] = useMemo(() => [
    { command: 'Open Dashboard', commandBn: 'ড্যাশবোর্ড',
      keywords: ['dashboard', 'home'], keywordsBn: ['ড্যাশবোর্ড', 'হোম'],
      action: () => { navigate('/'); toast.success(t('ড্যাশবোর্ড খুলছি', 'Opening dashboard')); } },
    { command: 'Open Control', commandBn: 'কন্ট্রোল',
      keywords: ['control', 'fan', 'heater', 'light'], keywordsBn: ['কন্ট্রোল', 'ফ্যান', 'হিটার', 'লাইট'],
      action: () => { navigate('/control'); } },
    { command: 'Open Alerts', commandBn: 'অ্যালার্ট',
      keywords: ['alert', 'alarm'], keywordsBn: ['অ্যালার্ট', 'সতর্ক'],
      action: () => { navigate('/alerts'); } },
    { command: 'Open Settings', commandBn: 'সেটিংস',
      keywords: ['setting'], keywordsBn: ['সেটিংস'],
      action: () => { navigate('/settings'); } },
  ], [navigate, lang]);

  const { isListening, isSupported, transcript, toggleListening } = useVoiceCommands({
    commands,
    onError: (e) => {
      if (e !== 'no-speech' && e !== 'aborted') toast.error(t(`ভয়েস ত্রুটি: ${e}`, `Voice error: ${e}`));
    },
  });

  if (!auth?.user) return null;
  if (HIDDEN_ROUTES.some((r) => location.pathname.startsWith(r))) return null;

  const handleEmergency = () => {
    setOpen(false);
    navigate('/alerts');
    toast.warning(t('সতর্কতা পেজে যাচ্ছি', 'Opening alerts'));
  };

  const handleCallWorker = () => {
    setOpen(false);
    const phone = (profile as { phone?: string | null } | null)?.phone;
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      toast.info(t('কর্মীর নম্বর সেট করা নেই — সেটিংসে যোগ করুন', 'No worker phone set — add it in Settings'));
    }
  };

  const handleVoice = () => {
    if (!isSupported) {
      toast.error(t('এই ব্রাউজারে ভয়েস সাপোর্ট নেই', 'Voice not supported in this browser'));
      return;
    }
    toggleListening();
  };

  return (
    <div className="fixed right-3 bottom-20 md:bottom-6 z-40">
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 -z-10 bg-black/20 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Voice listening tray (shown above the FAB while listening) */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-16 right-0 w-64 rounded-xl border bg-card p-3 shadow-xl"
            role="status" aria-live="polite"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <Mic size={16} className="animate-pulse" />
              {t('শুনছি...', 'Listening...')}
            </div>
            {transcript && (
              <p className="mt-1 text-xs italic text-muted-foreground">"{transcript}"</p>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t('বলুন: ড্যাশবোর্ড / কন্ট্রোল / অ্যালার্ট / সেটিংস', 'Say: dashboard / control / alerts / settings')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons (fan out) */}
      <AnimatePresence>
        {open && (
          <div className="absolute bottom-16 right-0 flex flex-col-reverse gap-3">
            {[
              { key: 'voice', icon: isListening ? MicOff : Mic, label: isListening ? t('থামান', 'Stop') : t('ভয়েস', 'Voice'), onClick: handleVoice, color: isListening ? 'bg-destructive' : 'bg-primary' },
              { key: 'emergency', icon: ShieldAlert, label: t('জরুরি', 'Emergency'), onClick: handleEmergency, color: 'bg-red-600' },
              { key: 'call', icon: Phone, label: t('কর্মী কল', 'Call Worker'), onClick: handleCallWorker, color: 'bg-emerald-600' },
            ].map((a, i) => {
              const Icon = a.icon;
              return (
                <motion.button
                  key={a.key}
                  initial={{ opacity: 0, scale: 0.3, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.3, y: 20 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={a.onClick}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-full text-white shadow-lg transition-colors',
                    a.color
                  )}
                  aria-label={a.label}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium whitespace-nowrap">{a.label}</span>
                </motion.button>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t('মেনু বন্ধ', 'Close menu') : t('দ্রুত অ্যাকশন', 'Quick actions')}
        aria-expanded={open}
        className={cn(
          'h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all',
          open ? 'bg-muted-foreground rotate-45' : 'bg-primary',
          isListening && !open && 'ring-4 ring-destructive/40 animate-pulse'
        )}
      >
        {open
          ? <X size={24} className="text-white" />
          : <Plus size={24} className="text-primary-foreground" />}
      </motion.button>
    </div>
  );
}

export default GlobalActionFAB;
