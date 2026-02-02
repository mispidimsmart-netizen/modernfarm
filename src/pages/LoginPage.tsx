import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Egg, User } from 'lucide-react';
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
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-primary to-primary/80">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center px-6 pt-16"
      >
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-lg">
          <Egg size={48} className="text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-white">
          {translations.dashboard.title[language]}
        </h1>
        <p className="mt-2 text-primary-foreground/80">
          Smart Layer Farm IoT
        </p>
      </motion.div>

      {/* Login/Signup Form */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-12 flex-1 rounded-t-[2rem] bg-background px-6 py-8"
      >
        <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
          {isSignUp 
            ? (language === 'bn' ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'Create Account')
            : translations.auth.welcome[language]
          }
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {language === 'bn' ? 'ইমেইল' : 'Email'}
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="h-14 rounded-xl pl-12 text-lg"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {translations.auth.password[language]}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-14 rounded-xl pl-12 text-lg"
                minLength={6}
                required
              />
            </div>
          </div>

          {isSignUp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              <label className="text-sm font-medium text-foreground">
                {translations.auth.farmName[language]}
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder={language === 'bn' ? 'আমার লেয়ার ফার্ম' : 'My Layer Farm'}
                  className="h-14 rounded-xl pl-12 text-lg"
                />
              </div>
            </motion.div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="h-14 w-full rounded-xl text-lg font-semibold shadow-button"
          >
            {isLoading 
              ? translations.common.loading[language] 
              : isSignUp 
                ? (language === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account')
                : translations.auth.login[language]
            }
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            {isSignUp
              ? (language === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'Already have an account? Login')
              : (language === 'bn' ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'Create new account')
            }
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {language === 'bn' 
            ? 'ESP32 IoT ডিভাইস দিয়ে চালিত' 
            : 'Powered by ESP32 IoT devices'}
        </p>
      </motion.div>
    </div>
  );
}
