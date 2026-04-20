import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Phone, User, Building2, Crown, HardHat, Ticket, Egg, Eye, EyeOff, ChevronDown, Bird, Drumstick } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { translations } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import farmeyeLogo from '@/assets/farmeye-logo-new-gen.png';

type FarmType = 'layer' | 'broiler';
type UserType = 'owner' | 'worker';

// Password strength calculator
function getPasswordStrength(pw: string): { level: 'weak' | 'medium' | 'strong'; label: string; color: string; percent: number } {
  if (!pw) return { level: 'weak', label: '', color: '', percent: 0 };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) return { level: 'weak', label: 'দুর্বল', color: 'bg-destructive', percent: 33 };
  if (score <= 3) return { level: 'medium', label: 'মাঝারি', color: 'bg-status-warning', percent: 66 };
  return { level: 'strong', label: 'শক্তিশালী', color: 'bg-status-normal', percent: 100 };
}

// Detect if input looks like a phone number
function isPhoneInput(value: string): boolean {
  const cleaned = value.replace(/\D/g, '');
  return cleaned.length >= 6 && /^0?1\d+$/.test(cleaned);
}

// Shared input style
const IconInput = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="relative">
    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>
    {children}
  </div>
);

const inputClass = "h-11 sm:h-13 rounded-xl border-2 border-border bg-muted/10 pl-11 sm:pl-12 text-base transition-all duration-200 focus:border-primary focus:bg-background focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]";

export function LoginPage() {
  const { language, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Shared
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  // Login state — unified identifier (phone or email)
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup state
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupFarmName, setSignupFarmName] = useState('');
  const [signupFarmType, setSignupFarmType] = useState<FarmType>('layer');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [userType, setUserType] = useState<UserType>('owner');
  const [invitationCode, setInvitationCode] = useState('');
  const [showOptionalEmail, setShowOptionalEmail] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(signupPassword), [signupPassword]);

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 11 && cleaned.startsWith('01');
  };

  // ─── Forgot Password Handler ───
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast({ title: 'ত্রুটি', description: 'ইমেইল ঠিকানা দিন', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'সফল!', description: 'পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে' });
        setShowForgotPassword(false);
        setForgotEmail('');
      }
    } catch {
      toast({ title: 'ত্রুটি', description: 'সংযোগ ত্রুটি', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Unified Login Handler ───
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const trimmed = identifier.trim();
    const isPhone = isPhoneInput(trimmed);

    if (isPhone && !validatePhone(trimmed)) {
      toast({ title: 'ত্রুটি', description: 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন (01 দিয়ে শুরু)', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    if (!isPhone && !trimmed.includes('@')) {
      toast({ title: 'ত্রুটি', description: 'সঠিক মোবাইল নম্বর বা ইমেইল দিন', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await signIn(trimmed, loginPassword);
      if (error) {
        toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
      } else {
        navigate('/');
      }
    } catch {
      toast({ title: 'ত্রুটি', description: 'সংযোগ ত্রুটি', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Signup Handler (always phone-primary) ───
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!signupName.trim()) {
      toast({ title: 'ত্রুটি', description: 'আপনার নাম দিন', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    if (!validatePhone(signupPhone)) {
      toast({ title: 'ত্রুটি', description: 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন (01 দিয়ে শুরু)', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    if (signupPassword.length < 6) {
      toast({ title: 'ত্রুটি', description: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      toast({ title: 'ত্রুটি', description: 'পাসওয়ার্ড মিলছে না', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    if (userType === 'worker' && !invitationCode.trim()) {
      toast({ title: 'ত্রুটি', description: 'আমন্ত্রণ কোড দিন', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    try {
      let validInvitation: any = null;
      if (userType === 'worker') {
        const { data: invitation, error: findError } = await supabase
          .from('worker_invitations')
          .select('*')
          .eq('invite_code', invitationCode.toUpperCase().trim())
          .is('used_at', null)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (!invitation || findError) {
          toast({ title: 'ত্রুটি', description: 'অবৈধ বা মেয়াদোত্তীর্ণ আমন্ত্রণ কোড', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        validInvitation = invitation;
      }

      const farmNameValue = userType === 'owner' ? (signupFarmName.trim() || 'আমার ফার্ম') : 'Worker Account';
      const { error } = await signUp(signupPhone, signupPassword, {
        farmName: farmNameValue,
        farmType: userType === 'owner' ? signupFarmType : undefined,
        userName: signupName.trim(),
        realEmail: signupEmail.trim() || undefined,
      });

      if (error) {
        toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
      } else {
        // Auto-login after signup
        const { error: signInError } = await signIn(signupPhone, signupPassword);
        if (!signInError) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Profile already created by trigger with metadata, update worker role if needed

            if (userType === 'worker' && validInvitation) {
              await supabase.from('user_roles').insert({
                user_id: user.id,
                farm_owner_id: validInvitation.farm_owner_id,
                role: 'worker',
              });
              await supabase.from('worker_invitations').update({
                used_at: new Date().toISOString(),
                used_by: user.id,
              }).eq('id', validInvitation.id);
            }
          }
          navigate('/');
        }
      }
    } catch {
      toast({ title: 'ত্রুটি', description: 'সংযোগ ত্রুটি', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Compact Header ───
  const Header = () => (
    <div className={`relative shrink-0 overflow-hidden bg-gradient-to-br from-[hsl(165,45%,35%)] via-primary to-[hsl(155,40%,30%)] px-6 text-center ${isSignUp ? 'pb-10 pt-5 sm:pb-14 sm:pt-8' : 'pb-12 pt-6 sm:pb-16 sm:pt-10'}`}>
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
            className={`mx-auto mb-1.5 flex items-center justify-center rounded-[2rem] bg-white shadow-2xl ${isSignUp ? 'h-14 w-14 sm:h-20 sm:w-20' : 'h-16 w-16 sm:h-24 sm:w-24'}`}
          >
            <img src={farmeyeLogo} alt="FarmEye" className={`rounded-2xl object-contain ${isSignUp ? 'h-10 w-10 sm:h-16 sm:w-16' : 'h-12 w-12 sm:h-20 sm:w-20'}`} />
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
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }}
          className={`mt-0.5 font-medium text-white/80 ${isSignUp ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'}`}>
          Smart Poultry Farm Automation
        </motion.p>
      </motion.div>
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 100 12" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full h-8 sm:h-10">
          <path d="M0 12H100V4Q100 0 96 0H4Q0 0 0 4V12Z" fill="hsl(var(--background))" />
        </svg>
      </div>
    </div>
  );

  const Footer = () => (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-3 sm:mt-4 text-center">
        <button type="button" onClick={() => { setIsSignUp(!isSignUp); setShowForgotPassword(false); }}
          className="text-sm font-semibold text-primary underline-offset-4 transition-colors hover:underline">
          {isSignUp ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'নতুন অ্যাকাউন্ট তৈরি করুন'}
        </button>
      </motion.div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="mt-2 sm:mt-3 text-center text-[10px] sm:text-xs text-muted-foreground/60 pb-2">
        © 2026 FarmEye Automation Platform
      </motion.p>
    </>
  );

  const Spinner = () => (
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className="h-5 w-5 rounded-full border-2 border-primary-foreground border-t-transparent" />
  );

  // Detect login input type for icon
  const loginIsPhone = isPhoneInput(identifier);
  const loginIcon = identifier.trim() === '' ? <Phone className="h-5 w-5" /> : (loginIsPhone ? <Phone className="h-5 w-5" /> : <Mail className="h-5 w-5" />);

  // ═══════════════════════════════════════════
  // LOGIN VIEW
  // ═══════════════════════════════════════════
  if (!isSignUp) {
    return (
      <div className="relative min-h-[100dvh] bg-gradient-to-br from-primary/5 via-background to-secondary/5 sm:flex sm:items-center sm:justify-center sm:p-6">
        <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background sm:h-auto sm:max-h-[95vh] sm:w-full sm:max-w-md sm:overflow-hidden sm:rounded-3xl sm:shadow-2xl sm:shadow-primary/20 sm:border sm:border-border/50">
        <Header />
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7, ease: 'easeOut' }}
          className="relative z-10 -mt-6 flex flex-1 flex-col justify-between overflow-y-auto bg-background px-4 sm:px-6 pb-4 pt-2">

          <div className="flex-1 flex flex-col justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mb-1 text-center">
            <h2 className="text-xl font-bold text-foreground">স্বাগতম</h2>
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
                  <Button type="submit" disabled={isLoading} className="h-14 w-full rounded-xl text-base font-bold shadow-lg shadow-primary/25">
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
                    <p className="text-[11px] text-muted-foreground">রেজিস্টার্ড মোবাইল নম্বর অথবা ইমেইল দিয়ে লগইন করুন</p>
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
                    <Button type="submit" disabled={isLoading} className="h-12 sm:h-14 w-full rounded-xl bg-primary text-base font-bold shadow-lg shadow-primary/30 transition-all hover:brightness-110 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98]">
                      {isLoading ? <Spinner /> : 'নিরাপদ লগইন'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trust Indicators */}
          {!showForgotPassword && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="mt-2 sm:mt-3 flex flex-col items-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs text-muted-foreground">
              <span>🔒 এনক্রিপ্টেড সংযোগ</span>
              <span>🛡 অফলাইন সেফ মোড সমর্থিত</span>
              <span>📡 রিয়েল-টাইম ফার্ম মনিটরিং</span>
            </motion.div>
          )}
          </div>

          <div className="mt-auto">
            <Footer />
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // SIGNUP VIEW
  // ═══════════════════════════════════════════
  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-background">
      <Header />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.7, ease: 'easeOut' }}
        className="relative z-10 -mt-2 flex-1 bg-background px-4 sm:px-6 pb-6 sm:pb-8 pt-2 sm:pt-4">

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mb-3 sm:mb-5 text-center">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">নতুন অ্যাকাউন্ট তৈরি করুন</h2>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground">আপনার ফার্ম যুক্ত করুন এবং স্মার্ট অটোমেশন শুরু করুন</p>
        </motion.div>

        {/* Account Type Toggle */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mb-3 sm:mb-5 flex rounded-xl bg-muted/60 p-1">
          <button type="button" onClick={() => setUserType('owner')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${userType === 'owner' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <Crown className="h-4 w-4" /> মালিক
          </button>
          <button type="button" onClick={() => setUserType('worker')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${userType === 'worker' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <HardHat className="h-4 w-4" /> কর্মী
          </button>
        </motion.div>

        <form onSubmit={handleSignup} className="space-y-3 sm:space-y-4">
          {/* 1. নাম */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{userType === 'owner' ? 'মালিকের নাম' : 'কর্মীর নাম'} *</label>
            <IconInput icon={<User className="h-5 w-5" />}>
              <Input type="text" value={signupName} onChange={(e) => setSignupName(e.target.value)}
                placeholder="আপনার পূর্ণ নাম লিখুন" className={inputClass} required maxLength={100} />
            </IconInput>
          </div>

          {/* 2. Mobile (required) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">মোবাইল নম্বর *</label>
            <IconInput icon={<Phone className="h-5 w-5" />}>
              <Input type="tel" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)}
                placeholder="আপনার ১১ সংখ্যার মোবাইল নম্বর লিখুন" className={inputClass} required maxLength={11} />
            </IconInput>
          </div>

          {/* 3. Email (optional, collapsible) */}
          <div className="space-y-1.5">
            <button type="button" onClick={() => setShowOptionalEmail(!showOptionalEmail)}
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-2">
              <Mail className="h-3.5 w-3.5" />
              {showOptionalEmail ? 'ইমেইল লুকান' : '+ ইমেইল যোগ করুন (ঐচ্ছিক)'}
            </button>
            <AnimatePresence>
              {showOptionalEmail && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <IconInput icon={<Mail className="h-5 w-5" />}>
                    <Input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="আপনার ইমেইল ঠিকানা লিখুন (ঐচ্ছিক)" className={inputClass} maxLength={255} />
                  </IconInput>
                  <p className="mt-1 text-[11px] text-muted-foreground">ইমেইল যোগ করলে পাসওয়ার্ড রিসেট ও ইমেইল দিয়ে লগইন করতে পারবেন</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Owner-specific fields */}
          <AnimatePresence>
            {userType === 'owner' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">ফার্মের নাম</label>
                  <IconInput icon={<Building2 className="h-5 w-5" />}>
                    <Input type="text" value={signupFarmName} onChange={(e) => setSignupFarmName(e.target.value)}
                      placeholder="আপনার ফার্মের নাম লিখুন" className={inputClass} maxLength={100} />
                  </IconInput>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">ফার্মের ধরন</label>
                  <IconInput icon={signupFarmType === 'layer' ? <Egg className="h-5 w-5" /> : <Drumstick className="h-5 w-5" />}>
                    <select value={signupFarmType} onChange={(e) => setSignupFarmType(e.target.value as FarmType)}
                      className={`${inputClass} flex w-full appearance-none pr-10 py-3`}>
                      <option value="layer">লেয়ার ফার্ম</option>
                      <option value="broiler">ব্রয়লার ফার্ম</option>
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground"><ChevronDown className="h-5 w-5" /></div>
                  </IconInput>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Worker invitation */}
          <AnimatePresence>
            {userType === 'worker' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1.5 overflow-hidden">
                <label className="text-sm font-medium text-foreground">আমন্ত্রণ কোড *</label>
                <IconInput icon={<Ticket className="h-5 w-5" />}>
                  <Input type="text" value={invitationCode} onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                    placeholder="যেমন: ABC123" className={`${inputClass} uppercase`} required />
                </IconInput>
                <p className="text-xs text-muted-foreground">মালিকের কাছ থেকে আমন্ত্রণ কোড নিন</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">পাসওয়ার্ড *</label>
            <IconInput icon={<Lock className="h-5 w-5" />}>
              <Input type={showPassword ? 'text' : 'password'} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)}
                placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড লিখুন" className={`${inputClass} pr-12`} minLength={6} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </IconInput>
            {signupPassword && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-1 pt-1">
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${passwordStrength.percent}%` }} transition={{ duration: 0.3 }}
                    className={`h-full rounded-full ${passwordStrength.color}`} />
                </div>
                <p className={`text-xs font-medium ${passwordStrength.level === 'weak' ? 'text-destructive' : passwordStrength.level === 'medium' ? 'text-status-warning' : 'text-status-normal'}`}>
                  পাসওয়ার্ড: {passwordStrength.label}
                </p>
              </motion.div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">পাসওয়ার্ড নিশ্চিত করুন *</label>
            <IconInput icon={<Lock className="h-5 w-5" />}>
              <Input type={showConfirmPassword ? 'text' : 'password'} value={signupConfirmPassword} onChange={(e) => setSignupConfirmPassword(e.target.value)}
                placeholder="পাসওয়ার্ড পুনরায় লিখুন" className={`${inputClass} pr-12`} minLength={6} required />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </IconInput>
            {signupConfirmPassword && signupPassword !== signupConfirmPassword && (
              <p className="text-xs font-medium text-destructive">পাসওয়ার্ড মিলছে না</p>
            )}
          </div>

          <div className="pt-1 sm:pt-2">
            <Button type="submit" disabled={isLoading} className="h-12 sm:h-14 w-full rounded-xl bg-primary text-base font-bold shadow-lg shadow-primary/30 transition-all hover:brightness-110 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98]">
              {isLoading ? <Spinner /> : 'নিরাপদ অ্যাকাউন্ট তৈরি করুন'}
            </Button>
          </div>
        </form>

        {/* Trust Indicators */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="mt-3 sm:mt-5 flex flex-col items-center gap-0.5 sm:gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
          <span>🔒 তথ্য এনক্রিপ্টেডভাবে সংরক্ষিত</span>
          <span>🛡 অফলাইন সুরক্ষা সমর্থিত</span>
          <span>📡 রিয়েল-টাইম ফার্ম মনিটরিং</span>
        </motion.div>

        <Footer />
      </motion.div>
    </div>
  );
}
