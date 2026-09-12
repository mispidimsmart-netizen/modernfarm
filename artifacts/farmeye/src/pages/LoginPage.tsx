import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { AuthFooter, AuthHeader } from '@/components/auth/AuthPrimitives';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { safeNextPath } from '@/lib/authFormUtils';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'));
  const [isSignUp, setIsSignUp] = useState(false);

  const toggleSignUp = () => setIsSignUp((v) => !v);

  // ═══════════════════════════════════════════
  // LOGIN VIEW
  // ═══════════════════════════════════════════
  if (!isSignUp) {
    return (
      <div className="relative min-h-[100dvh] bg-gradient-to-br from-primary/5 via-background to-secondary/5 sm:flex sm:items-center sm:justify-center sm:p-6">
        <div className="relative flex h-[100dvh] flex-col overflow-y-auto bg-background sm:h-auto sm:max-h-[95vh] sm:w-full sm:max-w-md sm:rounded-3xl sm:shadow-2xl sm:shadow-primary/20 sm:border sm:border-border/50">
          <AuthHeader isSignUp={false} />
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7, ease: 'easeOut' }}
            className="relative z-10 flex flex-1 flex-col bg-background px-4 sm:px-6 pb-6 pt-5 gap-5">

            <LoginForm nextPath={nextPath} />

            <div className="mt-6 pt-4 border-t border-border/40">
              <AuthFooter isSignUp={false} onToggle={toggleSignUp} />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // SIGNUP VIEW
  // ═══════════════════════════════════════════
  return (
    <div className="relative min-h-[100dvh] bg-gradient-to-br from-primary/5 via-background to-secondary/5 sm:flex sm:items-center sm:justify-center sm:p-6">
      <div className="relative flex min-h-[100dvh] flex-col bg-background sm:min-h-0 sm:max-h-[95vh] sm:w-full sm:max-w-md sm:overflow-y-auto sm:rounded-3xl sm:shadow-2xl sm:shadow-primary/20 sm:border sm:border-border/50">
        <AuthHeader isSignUp />
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7, ease: 'easeOut' }}
          className="relative z-10 flex-1 bg-background px-4 sm:px-6 pb-6 sm:pb-8 pt-4 sm:pt-5">

          <SignupForm nextPath={nextPath} isSignUp={isSignUp} />

          <div className="mt-6 pt-4 border-t border-border/40">
            <AuthFooter isSignUp onToggle={toggleSignUp} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
