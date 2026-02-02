import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Egg, User, Sparkles, Leaf } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { translations } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export function LoginPage() {
  const { language, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [farmName, setFarmName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, farmName);
        if (error) {
          toast({
            title: translations.common.error[language],
            description: error.message,
            variant: 'destructive',
          });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: translations.common.error[language],
            description: error.message,
            variant: 'destructive',
          });
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      toast({
        title: translations.common.error[language],
        description: language === 'bn' ? 'সংযোগ ত্রুটি' : 'Connection error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-secondary/80">
        {/* Floating decorative elements */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
          className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.15, scale: 1 }}
          transition={{ duration: 3, delay: 0.5, repeat: Infinity, repeatType: 'reverse' }}
          className="absolute -right-20 top-40 h-80 w-80 rounded-full bg-secondary/30 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ duration: 2, delay: 1, repeat: Infinity, repeatType: 'reverse' }}
          className="absolute bottom-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-white/10 blur-3xl"
        />
      </div>

      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center px-6 pt-16"
      >
        {/* Floating leaves decoration */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="absolute left-8 top-12"
        >
          <Leaf className="h-8 w-8 text-white/30 rotate-45" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="absolute right-8 top-20"
        >
          <Leaf className="h-6 w-6 text-white/20 -rotate-12" />
        </motion.div>

        {/* Logo */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
          className="relative mb-6"
        >
          <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white shadow-2xl shadow-black/20">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Egg size={56} className="text-primary" />
            </motion.div>
          </div>
          {/* Sparkle decoration */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="absolute -right-2 -top-2"
          >
            <Sparkles className="h-6 w-6 text-yellow-300" />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center text-3xl font-bold text-white drop-shadow-lg"
        >
          {translations.dashboard.title[language]}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-2 text-center text-primary-foreground/80"
        >
          Smart Layer Farm IoT
        </motion.p>
      </motion.div>

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 mt-10 flex-1 rounded-t-[2.5rem] bg-background px-6 py-8 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.15)]"
      >
        {/* Decorative top line */}
        <div className="absolute left-1/2 top-3 h-1 w-12 -translate-x-1/2 rounded-full bg-muted-foreground/20" />

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mb-8 text-center text-2xl font-bold text-foreground"
        >
          {isSignUp 
            ? (language === 'bn' ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'Create Account')
            : translations.auth.welcome[language]
          }
        </motion.h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="space-y-2"
          >
            <label className="text-sm font-medium text-foreground">
              {language === 'bn' ? 'ইমেইল' : 'Email'}
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg bg-primary/10 p-1.5">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="h-14 rounded-2xl border-2 border-muted bg-muted/30 pl-14 text-lg transition-all focus:border-primary focus:bg-background"
                required
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="space-y-2"
          >
            <label className="text-sm font-medium text-foreground">
              {translations.auth.password[language]}
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg bg-primary/10 p-1.5">
                <Lock className="h-4 w-4 text-primary" />
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-14 rounded-2xl border-2 border-muted bg-muted/30 pl-14 text-lg transition-all focus:border-primary focus:bg-background"
                minLength={6}
                required
              />
            </div>
          </motion.div>

          {isSignUp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <label className="text-sm font-medium text-foreground">
                {translations.auth.farmName[language]}
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg bg-secondary/10 p-1.5">
                  <User className="h-4 w-4 text-secondary" />
                </div>
                <Input
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder={language === 'bn' ? 'আমার লেয়ার ফার্ম' : 'My Layer Farm'}
                  className="h-14 rounded-2xl border-2 border-muted bg-muted/30 pl-14 text-lg transition-all focus:border-secondary focus:bg-background"
                />
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <Button
              type="submit"
              disabled={isLoading}
              className="h-14 w-full rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-lg font-semibold shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98]"
            >
              {isLoading 
                ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="h-5 w-5 rounded-full border-2 border-primary-foreground border-t-transparent"
                  />
                )
                : isSignUp 
                  ? (language === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account')
                  : translations.auth.login[language]
              }
            </Button>
          </motion.div>
        </form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-6 text-center"
        >
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
          >
            {isSignUp
              ? (language === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'Already have an account? Login')
              : (language === 'bn' ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'Create new account')
            }
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <div className="h-px flex-1 bg-border" />
          <span className="px-2">
            {language === 'bn' 
              ? 'ESP32 IoT ডিভাইস দিয়ে চালিত' 
              : 'Powered by ESP32 IoT devices'}
          </span>
          <div className="h-px flex-1 bg-border" />
        </motion.div>
      </motion.div>
    </div>
  );
}
