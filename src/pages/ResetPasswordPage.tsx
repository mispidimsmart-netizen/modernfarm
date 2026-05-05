import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import farmeyeLogo from '@/assets/farmeye-logo.png';

const inputClass = "h-13 rounded-xl border-2 border-muted bg-muted/20 pl-12 text-base transition-all focus:border-primary focus:bg-background";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: 'ত্রুটি', description: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে', variant: 'destructive' });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: 'ত্রুটি', description: 'পাসওয়ার্ড মিলছে না', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ title: 'ত্রুটি', description: error.message, variant: 'destructive' });
      } else {
        setIsDone(true);
        toast({ title: 'সফল!', description: 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে' });
        setTimeout(() => navigate('/'), 2000);
      }
    } catch {
      toast({ title: 'ত্রুটি', description: 'সংযোগ ত্রুটি', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isRecovery && !isDone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="text-center space-y-4">
          <img src={farmeyeLogo} alt="FarmEye" className="h-16 w-16 mx-auto" />
          <h1 className="text-xl font-bold text-foreground">অবৈধ লিংক</h1>
          <p className="text-sm text-muted-foreground">এই পাসওয়ার্ড রিসেট লিংকটি অবৈধ বা মেয়াদোত্তীর্ণ।</p>
          <Button onClick={() => navigate('/login')} className="rounded-xl">লগইন পেজে যান</Button>
        </div>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-status-normal mx-auto" />
          <h1 className="text-xl font-bold text-foreground">পাসওয়ার্ড পরিবর্তন সফল!</h1>
          <p className="text-sm text-muted-foreground">ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/85 px-6 pb-8 pt-10 text-center">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
        <div className="relative z-10">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/95 shadow-xl">
            <img src={farmeyeLogo} alt="FarmEye" className="h-8 w-8 object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">FarmEye</h1>
          <p className="mt-0.5 text-sm font-medium text-white/90">পাসওয়ার্ড রিসেট</p>
        </div>
      </div>

      {/* Form */}
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.7, ease: 'easeOut' }}
        className="relative z-10 -mt-5 flex-1 rounded-t-3xl bg-background px-6 pb-8 pt-8 shadow-[0_-4px_30px_-8px_rgba(0,0,0,0.1)]">

        <h2 className="text-xl font-bold text-foreground text-center">নতুন পাসওয়ার্ড সেট করুন</h2>
        <p className="mt-1 mb-6 text-sm text-muted-foreground text-center">আপনার নতুন নিরাপদ পাসওয়ার্ড লিখুন</p>

        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">নতুন পাসওয়ার্ড</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"><Lock className="h-5 w-5" /></div>
              <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড" className={`${inputClass} pr-12`} minLength={6} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">পাসওয়ার্ড নিশ্চিত করুন</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"><Lock className="h-5 w-5" /></div>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="পাসওয়ার্ড পুনরায় লিখুন" className={inputClass} minLength={6} required />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs font-medium text-destructive">পাসওয়ার্ড মিলছে না</p>
            )}
          </div>

          <div className="pt-1">
            <Button type="submit" disabled={isLoading} className="h-14 w-full rounded-xl text-base font-bold shadow-lg shadow-primary/25">
              {isLoading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="h-5 w-5 rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : 'পাসওয়ার্ড পরিবর্তন করুন'}
            </Button>
          </div>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground/60">© 2026 Nexiot Labs · FarmEye Automation Platform</p>
      </motion.div>
    </div>
  );
}
