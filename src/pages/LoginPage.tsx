import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Egg, User, Sparkles, Leaf, Phone, Building2, Crown, HardHat, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { translations } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type LoginMethod = 'email' | 'phone';
type FarmType = 'layer' | 'broiler';
type UserType = 'owner' | 'worker';

export function LoginPage() {
  const { language, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [farmName, setFarmName] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [farmType, setFarmType] = useState<FarmType>('layer');
  const [userType, setUserType] = useState<UserType>('owner');
  const [invitationCode, setInvitationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const isPhone = loginMethod === 'phone';

    // Basic validation
    if (isPhone) {
      const cleanedPhone = identifier.replace(/\D/g, '');
      if (cleanedPhone.length < 10 || cleanedPhone.length > 11) {
        toast({
          title: translations.common.error[language],
          description: language === 'bn' ? 'সঠিক মোবাইল নম্বর দিন' : 'Please enter a valid phone number',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
    }

    // Validate required fields for signup
    if (isSignUp && !userName.trim()) {
      toast({
        title: translations.common.error[language],
        description: language === 'bn' ? 'আপনার নাম দিন' : 'Please enter your name',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Validate invitation code for workers
    if (isSignUp && userType === 'worker' && !invitationCode.trim()) {
      toast({
        title: translations.common.error[language],
        description: language === 'bn' ? 'আমন্ত্রণ কোড দিন' : 'Please enter invitation code',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // For workers, validate invitation code first before signup
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
            toast({
              title: translations.common.error[language],
              description: language === 'bn' 
                ? 'অবৈধ বা মেয়াদোত্তীর্ণ আমন্ত্রণ কোড' 
                : 'Invalid or expired invitation code',
              variant: 'destructive',
            });
            setIsLoading(false);
            return;
          }
          validInvitation = invitation;
        }

        const { error } = await signUp(
          identifier, 
          password, 
          userType === 'owner' ? (farmName || (language === 'bn' ? 'আমার ফার্ম' : 'My Farm')) : 'Worker Account', 
          isPhone
        );
        if (error) {
          toast({
            title: translations.common.error[language],
            description: error.message,
            variant: 'destructive',
          });
        } else {
          // For phone signup, auto-login after signup and update profile
          if (isPhone) {
            const { error: signInError } = await signIn(identifier, password, isPhone);
            if (!signInError) {
              // Update profile with additional info
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase.from('profiles').update({
                  user_name: userName.trim(),
                  email: email.trim() || null,
                  farm_type: userType === 'owner' ? farmType : null,
                  farm_name: userType === 'owner' 
                    ? (farmName.trim() || (language === 'bn' ? 'আমার ফার্ম' : 'My Farm'))
                    : 'Worker Account',
                }).eq('id', user.id);

                // For workers, create the worker role and mark invitation as used
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
          } else {
            // For email signup, show success message
            toast({
              title: language === 'bn' ? 'সফল!' : 'Success!',
              description: language === 'bn' 
                ? 'অ্যাকাউন্ট তৈরি হয়েছে। ইমেইল যাচাই করুন।' 
                : 'Account created. Please verify your email.',
            });
          }
        }
      } else {
        const { error } = await signIn(identifier, password, isPhone);
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
        className="relative z-10 flex flex-col items-center px-6 pt-12"
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
          className="relative mb-4"
        >
          <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white shadow-2xl shadow-black/20">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Egg size={48} className="text-primary" />
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
          className="text-center text-2xl font-bold text-white drop-shadow-lg"
        >
          {translations.dashboard.title[language]}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-1 text-center text-sm text-primary-foreground/80"
        >
          Smart Layer Farm IoT
        </motion.p>
      </motion.div>

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 mt-6 flex-1 rounded-t-[2.5rem] bg-background px-6 py-6 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.15)]"
      >
        {/* Decorative top line */}
        <div className="absolute left-1/2 top-3 h-1 w-12 -translate-x-1/2 rounded-full bg-muted-foreground/20" />

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mb-4 text-center text-xl font-bold text-foreground"
        >
          {isSignUp 
            ? (language === 'bn' ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'Create Account')
            : translations.auth.welcome[language]
          }
        </motion.h2>

        {/* Login Method Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="mb-5 flex rounded-2xl bg-muted/50 p-1"
        >
          <button
            type="button"
            onClick={() => {
              setLoginMethod('phone');
              setIdentifier('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${
              loginMethod === 'phone'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Phone className="h-4 w-4" />
            {language === 'bn' ? 'মোবাইল' : 'Mobile'}
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod('email');
              setIdentifier('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${
              loginMethod === 'email'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail className="h-4 w-4" />
            {language === 'bn' ? 'ইমেইল' : 'Email'}
          </button>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={loginMethod}
              initial={{ opacity: 0, x: loginMethod === 'phone' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: loginMethod === 'phone' ? 20 : -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              <label className="text-sm font-medium text-foreground">
                {loginMethod === 'phone' 
                  ? (language === 'bn' ? 'মোবাইল নম্বর' : 'Mobile Number')
                  : (language === 'bn' ? 'ইমেইল' : 'Email')
                }
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg bg-primary/10 p-1.5">
                  {loginMethod === 'phone' ? (
                    <Phone className="h-4 w-4 text-primary" />
                  ) : (
                    <Mail className="h-4 w-4 text-primary" />
                  )}
                </div>
                <Input
                  type={loginMethod === 'phone' ? 'tel' : 'email'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={loginMethod === 'phone' ? '01XXXXXXXXX' : 'example@email.com'}
                  className="h-14 rounded-2xl border-2 border-muted bg-muted/30 pl-14 text-lg transition-all focus:border-primary focus:bg-background"
                  required
                />
              </div>
            </motion.div>
          </AnimatePresence>

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

          <AnimatePresence>
            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                {/* User Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {language === 'bn' ? 'আপনার নাম *' : 'Your Name *'}
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg bg-secondary/10 p-1.5">
                      <User className="h-4 w-4 text-secondary" />
                    </div>
                    <Input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder={language === 'bn' ? 'আপনার পুরো নাম' : 'Your full name'}
                      className="h-14 rounded-2xl border-2 border-muted bg-muted/30 pl-14 text-lg transition-all focus:border-secondary focus:bg-background"
                      required
                    />
                  </div>
                </div>

                {/* User Type Toggle */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {language === 'bn' ? 'অ্যাকাউন্টের ধরণ' : 'Account Type'}
                  </label>
                  <div className="flex rounded-2xl bg-muted/50 p-1">
                    <button
                      type="button"
                      onClick={() => setUserType('owner')}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${
                        userType === 'owner'
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Crown className="h-4 w-4" />
                      {language === 'bn' ? 'মালিক' : 'Owner'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserType('worker')}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${
                        userType === 'worker'
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <HardHat className="h-4 w-4" />
                      {language === 'bn' ? 'কর্মী' : 'Worker'}
                    </button>
                  </div>
                </div>

                {/* Owner-specific fields */}
                {userType === 'owner' && (
                  <>
                    {/* Farm Name */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        {translations.auth.farmName[language]}
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg bg-secondary/10 p-1.5">
                          <Building2 className="h-4 w-4 text-secondary" />
                        </div>
                        <Input
                          type="text"
                          value={farmName}
                          onChange={(e) => setFarmName(e.target.value)}
                          placeholder={language === 'bn' ? 'আমার ফার্ম' : 'My Farm'}
                          className="h-14 rounded-2xl border-2 border-muted bg-muted/30 pl-14 text-lg transition-all focus:border-secondary focus:bg-background"
                        />
                      </div>
                    </div>

                    {/* Farm Type */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        {language === 'bn' ? 'ফার্মের ধরণ' : 'Farm Type'}
                      </label>
                      <div className="flex rounded-2xl bg-muted/50 p-1">
                        <button
                          type="button"
                          onClick={() => setFarmType('layer')}
                          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${
                            farmType === 'layer'
                              ? 'bg-primary text-primary-foreground shadow-md'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Egg className="h-4 w-4" />
                          {language === 'bn' ? 'লেয়ার' : 'Layer'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFarmType('broiler')}
                          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${
                            farmType === 'broiler'
                              ? 'bg-primary text-primary-foreground shadow-md'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          🐔
                          {language === 'bn' ? 'ব্রয়লার' : 'Broiler'}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Worker-specific fields */}
                {userType === 'worker' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      {language === 'bn' ? 'আমন্ত্রণ কোড *' : 'Invitation Code *'}
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg bg-accent/50 p-1.5">
                        <Ticket className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <Input
                        type="text"
                        value={invitationCode}
                        onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                        placeholder={language === 'bn' ? 'যেমন: ABC123' : 'e.g., ABC123'}
                        className="h-14 rounded-2xl border-2 border-muted bg-muted/30 pl-14 text-lg uppercase transition-all focus:border-accent focus:bg-background"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'bn' 
                        ? 'মালিকের কাছ থেকে আমন্ত্রণ কোড নিন' 
                        : 'Get the invitation code from the farm owner'}
                    </p>
                  </div>
                )}

                {/* Email (Optional) - Only for owners */}
                {loginMethod === 'phone' && userType === 'owner' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      {language === 'bn' ? 'ইমেইল (ঐচ্ছিক)' : 'Email (Optional)'}
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg bg-secondary/10 p-1.5">
                        <Mail className="h-4 w-4 text-secondary" />
                      </div>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="h-14 rounded-2xl border-2 border-muted bg-muted/30 pl-14 text-lg transition-all focus:border-secondary focus:bg-background"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

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
          className="mt-5 text-center"
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
          className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground"
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
