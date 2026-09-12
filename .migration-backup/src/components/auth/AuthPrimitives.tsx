import { motion } from 'framer-motion';
import { Bird, Egg, Eye } from 'lucide-react';
import farmeyeLogo from '@/assets/farmeye-logo-new-gen.png';

/** Shared input wrapper with a leading icon. */
export const IconInput = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="relative">
    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>
    {children}
  </div>
);

export const inputClass =
  "h-11 sm:h-13 rounded-2xl border-2 border-border bg-muted/10 pl-11 sm:pl-12 text-base transition-all duration-200 focus:border-primary focus:bg-background focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]";

// Module-scope components — defining these inside LoginPage caused a remount
// (and motion-fade "blink") on every keystroke.
export const Spinner = () => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    className="h-5 w-5 rounded-full border-2 border-primary-foreground border-t-transparent"
  />
);

export const AuthFooter = ({ isSignUp, onToggle }: { isSignUp: boolean; onToggle: () => void }) => (
  <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-3 sm:mt-4 text-center">
      <button type="button" onClick={onToggle}
        className="text-sm font-semibold text-primary underline-offset-4 transition-colors hover:underline">
        {isSignUp ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'নতুন অ্যাকাউন্ট তৈরি করুন'}
      </button>
    </motion.div>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
      className="mt-2 sm:mt-3 text-center pb-2 space-y-0.5">
      <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground/80">
        A <span className="text-primary">Nexiot Labs</span> Product
      </p>
      <p className="text-[9px] sm:text-[10px] text-muted-foreground/50">
        © 2026 Nexiot Labs · FarmEye Automation Platform
      </p>
    </motion.div>
  </>
);

export const AuthHeader = ({ isSignUp }: { isSignUp: boolean }) => (
  <div className={`sticky top-0 z-30 shrink-0 overflow-hidden rounded-b-[2rem] sm:rounded-b-[2.5rem] bg-gradient-to-br from-primary/90 via-primary to-primary/80 dark:from-primary/70 dark:via-primary/85 dark:to-primary/60 px-6 text-center shadow-lg shadow-primary/20 ${isSignUp ? 'pb-10 pt-5 sm:pb-14 sm:pt-8' : 'pb-12 pt-6 sm:pb-16 sm:pt-10'}`}>
    <div className="absolute inset-0 overflow-hidden">
      <motion.div animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-8 left-6 text-white/10">
        <Eye className="h-8 w-8 sm:h-10 sm:w-10" />
      </motion.div>
      <motion.div animate={{ y: [0, 8, 0], rotate: [0, -5, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute top-12 right-8 text-white/10">
        <Eye className="h-6 w-6 sm:h-8 sm:w-8" />
      </motion.div>
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-16 left-16 text-white/8">
        <Bird className="h-6 w-6 sm:h-7 sm:w-7" />
      </motion.div>
      <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="absolute bottom-20 right-14 text-white/8">
        <Egg className="h-5 w-5 sm:h-6 sm:w-6" />
      </motion.div>
    </div>
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10">
      <div className="relative mx-auto w-fit">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
          className={`mx-auto mb-1.5 flex items-center justify-center rounded-[2rem] bg-white dark:bg-card shadow-2xl ring-1 ring-white/20 dark:ring-white/10 ${isSignUp ? 'h-14 w-14 sm:h-20 sm:w-20' : 'h-16 w-16 sm:h-24 sm:w-24'}`}
        >
          <img src={farmeyeLogo} alt="FarmEye" fetchPriority="high" decoding="async" className={`rounded-2xl object-contain ${isSignUp ? 'h-10 w-10 sm:h-16 sm:w-16' : 'h-12 w-12 sm:h-20 sm:w-20'}`} />
        </motion.div>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className={`absolute ${isSignUp ? '-top-1 -right-1 sm:-top-2 sm:-right-2' : '-top-2 -right-2 sm:-top-3 sm:-right-3'}`}>
          <span className="text-xl sm:text-2xl">✨</span>
        </motion.div>
      </div>
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
        className={`font-bold tracking-tight text-white ${isSignUp ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>
        FarmEye
        <span className="sr-only"> — Smart Poultry Farm Automation by Nexiot Labs</span>
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }}
        className={`mt-0.5 font-medium text-white/80 ${isSignUp ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'}`}>
        Smart Poultry Farm Automation
      </motion.p>
    </motion.div>
  </div>
);
