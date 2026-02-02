import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Lock, Egg } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { translations } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export function LoginPage() {
  const { language, login } = useApp();
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(phone, password);
      if (!success) {
        toast({
          title: translations.common.error[language],
          description: language === 'bn' 
            ? 'ভুল ফোন নম্বর বা পাসওয়ার্ড' 
            : 'Invalid phone number or password',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: translations.common.error[language],
        description: language === 'bn' 
          ? 'সংযোগ ত্রুটি' 
          : 'Connection error',
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

      {/* Login Form */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-12 flex-1 rounded-t-[2rem] bg-background px-6 py-8"
      >
        <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
          {translations.auth.welcome[language]}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {translations.auth.phone[language]}
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
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
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="h-14 w-full rounded-xl text-lg font-semibold shadow-button"
          >
            {isLoading ? translations.common.loading[language] : translations.auth.login[language]}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {language === 'bn' 
            ? 'ESP32 IoT ডিভাইস দিয়ে চালিত' 
            : 'Powered by ESP32 IoT devices'}
        </p>
      </motion.div>
    </div>
  );
}
