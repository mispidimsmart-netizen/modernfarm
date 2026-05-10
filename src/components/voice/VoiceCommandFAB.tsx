import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceCommands, type VoiceCommand } from '@/hooks/useVoiceCommands';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Bengali voice command FAB.
 * Wires the existing useVoiceCommands hook to a global floating mic button.
 * Recognizes navigation + (announce-only) actuator commands. Actuator commands
 * are routed to /control with a hint toast — they do NOT directly write
 * device_commands (preserves Hardware-as-Source-of-Truth invariant).
 */
export function VoiceCommandFAB() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const commands: VoiceCommand[] = useMemo(() => [
    {
      command: 'Open Dashboard',
      commandBn: 'ড্যাশবোর্ড খুলুন',
      keywords: ['dashboard', 'home'],
      keywordsBn: ['ড্যাশবোর্ড', 'হোম', 'প্রথম'],
      action: () => { navigate('/'); toast.success('ড্যাশবোর্ড খুলছি'); },
    },
    {
      command: 'Open Control',
      commandBn: 'কন্ট্রোল',
      keywords: ['control', 'fan', 'heater', 'light'],
      keywordsBn: ['কন্ট্রোল', 'ফ্যান', 'হিটার', 'লাইট', 'বাতি', 'চালু', 'বন্ধ'],
      action: () => { navigate('/control'); toast.info('কন্ট্রোল পেইজে — বাটন চাপুন'); },
    },
    {
      command: 'Open Alerts',
      commandBn: 'অ্যালার্ট',
      keywords: ['alert', 'alarm', 'notification'],
      keywordsBn: ['অ্যালার্ট', 'সতর্ক', 'নোটিফিকেশন'],
      action: () => { navigate('/alerts'); toast.success('অ্যালার্ট দেখাচ্ছি'); },
    },
    {
      command: 'Open Settings',
      commandBn: 'সেটিংস',
      keywords: ['setting', 'config'],
      keywordsBn: ['সেটিংস', 'কনফিগ'],
      action: () => { navigate('/settings'); },
    },
    {
      command: 'Training videos',
      commandBn: 'ট্রেনিং',
      keywords: ['training', 'video', 'tutorial'],
      keywordsBn: ['ট্রেনিং', 'ভিডিও', 'শিখুন', 'টিউটোরিয়াল'],
      action: () => { navigate('/training'); },
    },
  ], [navigate]);

  const { isListening, isSupported, transcript, toggleListening } = useVoiceCommands({
    commands,
    onError: (e) => {
      if (e !== 'no-speech' && e !== 'aborted') {
        toast.error(`ভয়েস ত্রুটি: ${e}`);
      }
    },
  });

  if (!isSupported) return null;

  return (
    <>
      <button
        aria-label={isListening ? 'ভয়েস কমান্ড থামান' : 'ভয়েস কমান্ড চালু করুন'}
        onClick={() => { setOpen(true); if (!isListening) toggleListening(); }}
        className={cn(
          'fixed z-40 right-3 bottom-20 md:bottom-6 h-12 w-12 rounded-full shadow-lg',
          'flex items-center justify-center transition-all',
          isListening
            ? 'bg-destructive text-destructive-foreground animate-pulse'
            : 'bg-primary text-primary-foreground hover:scale-105'
        )}
      >
        {isListening ? <Mic size={20} /> : <Mic size={20} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed z-40 right-3 bottom-36 md:bottom-20 w-72 rounded-xl border bg-card p-4 shadow-xl"
            role="dialog"
            aria-label="ভয়েস কমান্ড"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {isListening ? <Mic size={16} className="text-destructive" /> : <MicOff size={16} />}
                {isListening ? 'শুনছি...' : 'ভয়েস কমান্ড'}
              </div>
              <button onClick={() => setOpen(false)} aria-label="বন্ধ করুন" className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            {transcript && (
              <p className="text-xs text-muted-foreground mb-2 italic">"{transcript}"</p>
            )}
            <p className="text-xs text-muted-foreground mb-2">যা বলতে পারেন:</p>
            <ul className="space-y-1 text-xs">
              {commands.map((c) => (
                <li key={c.command} className="text-foreground">• {c.commandBn}</li>
              ))}
            </ul>
            <button
              onClick={toggleListening}
              className={cn(
                'mt-3 w-full rounded-lg py-2 text-sm font-medium transition',
                isListening ? 'bg-destructive/10 text-destructive' : 'bg-primary text-primary-foreground'
              )}
            >
              {isListening ? 'থামান' : 'শুনুন'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
