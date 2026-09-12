import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Phone, User, Building2, Crown, HardHat, Ticket, Egg, Eye, EyeOff, ChevronDown, Drumstick } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { IconInput, inputClass, Spinner } from '@/components/auth/AuthPrimitives';
import { useSignupForm } from '@/hooks/useSignupForm';
import type { FarmType } from '@/lib/authFormUtils';

export function SignupForm({ nextPath, isSignUp }: { nextPath: string; isSignUp: boolean }) {
  const s = useSignupForm(nextPath, isSignUp);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mb-3 sm:mb-5 text-center">
        <h2 className="text-lg sm:text-xl font-bold text-foreground">নতুন অ্যাকাউন্ট তৈরি করুন</h2>
        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground">আপনার ফার্ম যুক্ত করুন এবং স্মার্ট অটোমেশন শুরু করুন</p>
      </motion.div>

      {/* Account Type Toggle */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mb-3 sm:mb-5 flex rounded-xl bg-muted/60 p-1">
        <button type="button" onClick={() => s.setUserType('owner')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${s.userType === 'owner' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          <Crown className="h-4 w-4" /> মালিক
        </button>
        <button type="button" onClick={() => s.setUserType('worker')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${s.userType === 'worker' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          <HardHat className="h-4 w-4" /> কর্মী
        </button>
      </motion.div>

      <form onSubmit={s.handleSignup} className="space-y-4">
        {/* 1. নাম */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">{s.userType === 'owner' ? 'মালিকের নাম' : 'কর্মীর নাম'} *</label>
          <IconInput icon={<User className="h-5 w-5" />}>
            <Input type="text" value={s.signupName} onChange={(e) => s.setSignupName(e.target.value)}
              placeholder="আপনার পূর্ণ নাম লিখুন" className={inputClass} required maxLength={100} />
          </IconInput>
        </div>

        {/* 2. Mobile (required) */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">মোবাইল নম্বর *</label>
          <IconInput icon={<Phone className="h-5 w-5" />}>
            <Input type="tel" value={s.signupPhone} onChange={(e) => s.setSignupPhone(e.target.value)}
              placeholder="আপনার ১১ সংখ্যার মোবাইল নম্বর লিখুন" className={inputClass} required maxLength={11} />
          </IconInput>
        </div>

        {/* 3. Email (optional, collapsible) */}
        <div className="space-y-1.5">
          <button type="button" onClick={() => s.setShowOptionalEmail(!s.showOptionalEmail)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-2">
            <Mail className="h-3.5 w-3.5" />
            {s.showOptionalEmail ? 'ইমেইল লুকান' : '+ ইমেইল যোগ করুন (ঐচ্ছিক)'}
          </button>
          <AnimatePresence>
            {s.showOptionalEmail && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <IconInput icon={<Mail className="h-5 w-5" />}>
                  <Input type="email" value={s.signupEmail} onChange={(e) => s.setSignupEmail(e.target.value)}
                    placeholder="আপনার ইমেইল ঠিকানা লিখুন (ঐচ্ছিক)" className={inputClass} maxLength={255} />
                </IconInput>
                <p className="mt-1 text-[11px] text-muted-foreground">ইমেইল যোগ করলে পাসওয়ার্ড রিসেট ও ইমেইল দিয়ে লগইন করতে পারবেন</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Owner-specific fields */}
        <AnimatePresence>
          {s.userType === 'owner' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">ফার্মের নাম</label>
                <IconInput icon={<Building2 className="h-5 w-5" />}>
                  <Input type="text" value={s.signupFarmName} onChange={(e) => s.setSignupFarmName(e.target.value)}
                    placeholder="আপনার ফার্মের নাম লিখুন" className={inputClass} maxLength={100} />
                </IconInput>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">ফার্মের ধরন</label>
                <IconInput icon={s.signupFarmType === 'layer' ? <Egg className="h-5 w-5" /> : <Drumstick className="h-5 w-5" />}>
                  <select value={s.signupFarmType} onChange={(e) => s.setSignupFarmType(e.target.value as FarmType)}
                    className={`${inputClass} flex w-full appearance-none pr-10 py-3`}>
                    <option value="layer">লেয়ার ফার্ম</option>
                    <option value="broiler">ব্রয়লার ফার্ম</option>
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground"><ChevronDown className="h-5 w-5" /></div>
                </IconInput>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">অর্গানাইজেশন *</label>
                <IconInput icon={<Building2 className="h-5 w-5" />}>
                  <select
                    value={s.signupOrgId}
                    onChange={(e) => s.setSignupOrgId(e.target.value)}
                    required
                    aria-required="true"
                    className={`${inputClass} flex w-full appearance-none pr-10 py-3`}
                  >
                    <option value="">— অর্গানাইজেশন বেছে নিন —</option>
                    {s.orgOptions.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground"><ChevronDown className="h-5 w-5" /></div>
                </IconInput>
                <p className="text-[11px] text-muted-foreground">আপনার ফার্ম এই অর্গানাইজেশনের অধীনে যুক্ত হবে। অ্যাডমিন পরে পরিবর্তন করতে পারবেন।</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Worker invitation */}
        <AnimatePresence>
          {s.userType === 'worker' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1.5 overflow-hidden">
              <label className="text-sm font-medium text-foreground">আমন্ত্রণ কোড *</label>
              <IconInput icon={<Ticket className="h-5 w-5" />}>
                <Input type="text" value={s.invitationCode} onChange={(e) => s.setInvitationCode(e.target.value.toUpperCase())}
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
            <Input type={s.showPassword ? 'text' : 'password'} value={s.signupPassword} onChange={(e) => s.setSignupPassword(e.target.value)}
              placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড লিখুন" className={`${inputClass} pr-12`} minLength={6} required />
            <button type="button" onClick={() => s.setShowPassword(!s.showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
              {s.showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </IconInput>
          {s.signupPassword && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-1 pt-1">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${s.passwordStrength.percent}%` }} transition={{ duration: 0.3 }}
                  className={`h-full rounded-full ${s.passwordStrength.color}`} />
              </div>
              <p className={`text-xs font-medium ${s.passwordStrength.level === 'weak' ? 'text-destructive' : s.passwordStrength.level === 'medium' ? 'text-status-warning' : 'text-status-normal'}`}>
                পাসওয়ার্ড: {s.passwordStrength.label}
              </p>
            </motion.div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">পাসওয়ার্ড নিশ্চিত করুন *</label>
          <IconInput icon={<Lock className="h-5 w-5" />}>
            <Input type={s.showConfirmPassword ? 'text' : 'password'} value={s.signupConfirmPassword} onChange={(e) => s.setSignupConfirmPassword(e.target.value)}
              placeholder="পাসওয়ার্ড পুনরায় লিখুন" className={`${inputClass} pr-12`} minLength={6} required />
            <button type="button" onClick={() => s.setShowConfirmPassword(!s.showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
              {s.showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </IconInput>
          {s.signupConfirmPassword && s.signupPassword !== s.signupConfirmPassword && (
            <p className="text-xs font-medium text-destructive">পাসওয়ার্ড মিলছে না</p>
          )}
        </div>

        <div className="pt-2">
          <Button type="submit" disabled={s.isLoading} className="h-12 sm:h-14 w-full rounded-2xl bg-primary text-base font-bold shadow-lg shadow-primary/30 transition-all hover:brightness-110 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98]">
            {s.isLoading ? <Spinner /> : 'নিরাপদ অ্যাকাউন্ট তৈরি করুন'}
          </Button>
        </div>
      </form>

      {/* Trust Indicators */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="mt-5 sm:mt-6 flex flex-col items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
        <span>🔒 তথ্য এনক্রিপ্টেডভাবে সংরক্ষিত</span>
        <span>🛡 অফলাইন সুরক্ষা সমর্থিত</span>
        <span>📡 রিয়েল-টাইম ফার্ম মনিটরিং</span>
      </motion.div>
    </>
  );
}
