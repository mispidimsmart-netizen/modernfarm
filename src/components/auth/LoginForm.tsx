import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Phone, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { IconInput, inputClass, Spinner } from '@/components/auth/AuthPrimitives';
import { isPhoneInput } from '@/lib/authFormUtils';
import { useLoginForm } from '@/hooks/useLoginForm';

export function LoginForm({ nextPath }: { nextPath: string }) {
  const {
    isLoading,
    showPassword, setShowPassword,
    showForgotPassword, setShowForgotPassword,
    forgotEmail, setForgotEmail,
    identifier, setIdentifier,
    loginPassword, setLoginPassword,
    handleLogin, handleForgotPassword,
  } = useLoginForm(nextPath);

  const loginIsPhone = isPhoneInput(identifier);
  const loginIcon = identifier.trim() === ''
    ? <Phone className="h-5 w-5" />
    : (loginIsPhone ? <Phone className="h-5 w-5" /> : <Mail className="h-5 w-5" />);

  return (
    <div className="flex-1 flex flex-col">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mb-3 text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">স্বাগতম</h2>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">আপনার ফার্মে আবার স্বাগতম</p>
      </motion.div>

      {/* Forgot Password View */}
      <AnimatePresence mode="wait">
        {showForgotPassword ? (
          <motion.div key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-5">
            <h3 className="text-base font-semibold text-foreground mb-1">পাসওয়ার্ড রিসেট করুন</h3>
            <p className="text-xs text-muted-foreground mb-4">আপনার রেজিস্টার্ড ইমেইল ঠিকানা দিন। আমরা একটি রিসেট লিংক পাঠাবো।</p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">ইমেইল</label>
                <IconInput icon={<Mail className="h-5 w-5" />}>
                  <Input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="আপনার ইমেইল ঠিকানা লিখুন" className={inputClass} required />
                </IconInput>
              </div>
              <Button type="submit" disabled={isLoading} className="h-14 w-full rounded-2xl text-base font-bold shadow-lg shadow-primary/25">
                {isLoading ? <Spinner /> : 'রিসেট লিংক পাঠান'}
              </Button>
              <button type="button" onClick={() => setShowForgotPassword(false)}
                className="w-full text-center text-sm font-medium text-primary hover:underline">
                ← লগইনে ফিরে যান
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <form onSubmit={handleLogin} className="mt-3 sm:mt-5 space-y-3 sm:space-y-4">
              {/* Unified identifier input */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">মোবাইল নম্বর / ইমেইল</label>
                <IconInput icon={loginIcon}>
                  <Input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="মোবাইল নম্বর বা ইমেইল লিখুন"
                    className={inputClass} required />
                </IconInput>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">পাসওয়ার্ড</label>
                  <button type="button" onClick={() => setShowForgotPassword(true)}
                    className="text-xs font-medium text-primary hover:underline underline-offset-2">
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                </div>
                <IconInput icon={<Lock className="h-5 w-5" />}>
                  <Input type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="আপনার নিরাপদ পাসওয়ার্ড লিখুন" className={`${inputClass} pr-12`} minLength={6} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </IconInput>
              </div>

              <div className="pt-1 sm:pt-2">
                <Button type="submit" disabled={isLoading} className="h-12 sm:h-14 w-full rounded-2xl bg-primary text-base font-bold shadow-lg shadow-primary/30 transition-all hover:brightness-110 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98]">
                  {isLoading ? <Spinner /> : 'নিরাপদ লগইন'}
                </Button>
              </div>

              <GoogleSignInButton nextPath={nextPath} />
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trust Indicators */}
      {!showForgotPassword && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="mt-5 sm:mt-6 flex flex-col items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
          <span>🔒 এনক্রিপ্টেড সংযোগ</span>
          <span>🛡 অফলাইন সেফ মোড সমর্থিত</span>
          <span>📡 রিয়েল-টাইম ফার্ম মনিটরিং</span>
        </motion.div>
      )}
    </div>
  );
}
