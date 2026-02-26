import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Phone, User, Building2, Crown, HardHat, Ticket, Egg, Eye, EyeOff, Shield, Wifi, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { translations } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import farmeyeLogo from '@/assets/farmeye-logo.png';

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
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const isPhone = loginMethod === 'phone';

    // Validation
    if (isPhone) {
      const cleanedPhone = identifier.replace(/\D/g, '');
      if (cleanedPhone.length !== 11 || !cleanedPhone.startsWith('01')) {
        toast({
          title: 'ত্রুটি',
          description: 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন (01 দিয়ে শুরু)',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
    }

    if (isSignUp && !userName.trim()) {
      toast({
        title: translations.common.error[language],
        description: language === 'bn' ? 'আপনার নাম দিন' : 'Please enter your name',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

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
          if (isPhone) {
            const { error: signInError } = await signIn(identifier, password, isPhone);
            if (!signInError) {
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
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Header Section - Green branded area */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/85 px-6 pb-10 pt-14 text-center">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
            className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/95 shadow-xl"
          >
            <img src={farmeyeLogo} alt="FarmEye" className="h-12 w-12 object-contain" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-3xl font-bold tracking-tight text-white"
          >
            FarmEye
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-1 text-base font-medium text-white/90"
          >
            Smart Poultry Farm Automation
          </motion.p>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-2.5 text-xs text-white/70 tracking-wide"
          >
            ২৪/৭ পরিবেশ নিয়ন্ত্রণ • অফলাইন সুরক্ষা • ইন্ডাস্ট্রিয়াল নিরাপত্তা
          </motion.p>
        </motion.div>
      </div>

      {/* Form Card - slides up over header */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.7, ease: 'easeOut' }}
        className="relative z-10 -mt-5 flex-1 rounded-t-3xl bg-background px-6 pb-8 pt-8 shadow-[0_-4px_30px_-8px_rgba(0,0,0,0.1)]"
      >
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-1 text-center"
        >
          <h2 className="text-xl font-bold text-foreground">
            {isSignUp 
              ? (language === 'bn' ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'Create Account')
              : 'স্বাগতম'
            }
          </h2>
          {!isSignUp && (
            <p className="mt-1 text-sm text-muted-foreground">
              আপনার ফার্ম নিরাপদভাবে পরিচালনা করতে লগইন করুন
            </p>
          )}
        </motion.div>

        {/* Login Method Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-5 mt-5 flex rounded-xl bg-muted/60 p-1"
        >
          <button
            type="button"
            onClick={() => { setLoginMethod('phone'); setIdentifier(''); }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              loginMethod === 'phone'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Phone className="h-4 w-4" />
            মোবাইল
          </button>
          <button
            type="button"
            onClick={() => { setLoginMethod('email'); setIdentifier(''); }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              loginMethod === 'email'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail className="h-4 w-4" />
            ইমেইল
          </button>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Identifier Field */}
          <AnimatePresence mode="wait">
            <motion.div
              key={loginMethod}
              initial={{ opacity: 0, x: loginMethod === 'phone' ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: loginMethod === 'phone' ? 16 : -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-1.5"
            >
              <label className="text-sm font-medium text-foreground">
                {loginMethod === 'phone' ? 'মোবাইল নম্বর' : (language === 'bn' ? 'ইমেইল' : 'Email')}
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {loginMethod === 'phone' ? <Phone className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                </div>
                <Input
                  type={loginMethod === 'phone' ? 'tel' : 'email'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={loginMethod === 'phone' 
                    ? 'আপনার ১১ সংখ্যার মোবাইল নম্বর লিখুন' 
                    : 'example@email.com'
                  }
                  className="h-13 rounded-xl border-2 border-muted bg-muted/20 pl-12 text-base transition-all focus:border-primary focus:bg-background"
                  required
                />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">পাসওয়ার্ড</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Lock className="h-5 w-5" />
              </div>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="আপনার নিরাপদ পাসওয়ার্ড লিখুন"
                className="h-13 rounded-xl border-2 border-muted bg-muted/20 pl-12 pr-12 text-base transition-all focus:border-primary focus:bg-background"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Sign Up Fields */}
          <AnimatePresence>
            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                {/* User Name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    {language === 'bn' ? 'আপনার নাম *' : 'Your Name *'}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <User className="h-5 w-5" />
                    </div>
                    <Input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder={language === 'bn' ? 'আপনার পুরো নাম' : 'Your full name'}
                      className="h-13 rounded-xl border-2 border-muted bg-muted/20 pl-12 text-base transition-all focus:border-primary focus:bg-background"
                      required
                    />
                  </div>
                </div>

                {/* User Type Toggle */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    {language === 'bn' ? 'অ্যাকাউন্টের ধরণ' : 'Account Type'}
                  </label>
                  <div className="flex rounded-xl bg-muted/60 p-1">
                    <button
                      type="button"
                      onClick={() => setUserType('owner')}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                        userType === 'owner'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Crown className="h-4 w-4" />
                      {language === 'bn' ? 'মালিক' : 'Owner'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserType('worker')}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                        userType === 'worker'
                          ? 'bg-primary text-primary-foreground shadow-sm'
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
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">
                        {translations.auth.farmName[language]}
                      </label>
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <Input
                          type="text"
                          value={farmName}
                          onChange={(e) => setFarmName(e.target.value)}
                          placeholder={language === 'bn' ? 'আমার ফার্ম' : 'My Farm'}
                          className="h-13 rounded-xl border-2 border-muted bg-muted/20 pl-12 text-base transition-all focus:border-primary focus:bg-background"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">
                        {language === 'bn' ? 'ফার্মের ধরণ' : 'Farm Type'}
                      </label>
                      <div className="flex rounded-xl bg-muted/60 p-1">
                        <button
                          type="button"
                          onClick={() => setFarmType('layer')}
                          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                            farmType === 'layer'
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Egg className="h-4 w-4" />
                          {language === 'bn' ? 'লেয়ার' : 'Layer'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFarmType('broiler')}
                          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                            farmType === 'broiler'
                              ? 'bg-primary text-primary-foreground shadow-sm'
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
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      {language === 'bn' ? 'আমন্ত্রণ কোড *' : 'Invitation Code *'}
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Ticket className="h-5 w-5" />
                      </div>
                      <Input
                        type="text"
                        value={invitationCode}
                        onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                        placeholder={language === 'bn' ? 'যেমন: ABC123' : 'e.g., ABC123'}
                        className="h-13 rounded-xl border-2 border-muted bg-muted/20 pl-12 text-base uppercase transition-all focus:border-primary focus:bg-background"
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

                {/* Email (Optional) */}
                {loginMethod === 'phone' && userType === 'owner' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      {language === 'bn' ? 'ইমেইল (ঐচ্ছিক)' : 'Email (Optional)'}
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Mail className="h-5 w-5" />
                      </div>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="h-13 rounded-xl border-2 border-muted bg-muted/20 pl-12 text-base transition-all focus:border-primary focus:bg-background"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="pt-1"
          >
            <Button
              type="submit"
              disabled={isLoading}
              className="h-14 w-full rounded-xl text-base font-bold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/35 active:scale-[0.98]"
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
                  : 'নিরাপদ লগইন'
              }
            </Button>
          </motion.div>
        </form>

        {/* Trust Indicators */}
        {!isSignUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            className="mt-5 flex flex-col items-center gap-1.5"
          >
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">🔒 এনক্রিপ্টেড সংযোগ</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">🛡 অফলাইন সেফ মোড সমর্থিত</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">📡 রিয়েল-টাইম ফার্ম মনিটরিং</span>
            </div>
          </motion.div>
        )}

        {/* Toggle Sign Up / Login */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-center"
        >
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-semibold text-primary underline-offset-4 transition-colors hover:underline"
          >
            {isSignUp
              ? (language === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'Already have an account? Login')
              : 'নতুন অ্যাকাউন্ট তৈরি করুন'
            }
          </button>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center text-xs text-muted-foreground/60"
        >
          © 2026 FarmEye Automation Platform
        </motion.p>
      </motion.div>
    </div>
  );
}
