import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getPasswordStrength, validatePhone, type FarmType, type UserType } from '@/lib/authFormUtils';

/** Signup state, organization options and submit handler. */
export function useSignupForm(nextPath: string, isSignUp: boolean) {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
  const [signupOrgId, setSignupOrgId] = useState<string>('');
  const [orgOptions, setOrgOptions] = useState<Array<{ id: string; name: string; name_en: string }>>([]);

  // Load active organizations for signup picker
  useEffect(() => {
    if (!isSignUp) return;
    supabase.rpc('list_active_organizations_for_signup' as any).then(({ data }) => {
      if (data) setOrgOptions(data as any);
    });
  }, [isSignUp]);

  const passwordStrength = useMemo(() => getPasswordStrength(signupPassword), [signupPassword]);

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

    if (userType === 'owner' && !signupOrgId) {
      toast({ title: 'ত্রুটি', description: 'অনুগ্রহ করে একটি অর্গানাইজেশন নির্বাচন করুন', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    try {
      // Note: invitation code is validated server-side via redeem_invitation RPC.
      // We no longer pre-fetch worker_invitations (RLS now blocks anonymous reads
      // to prevent invitation code enumeration).

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
            if (userType === 'worker') {
              // Atomic redemption: validates code, creates user_role + farm_members + marks invite used
              const { data: redeemData, error: redeemError } = await supabase.rpc('redeem_invitation', {
                _code: invitationCode.toUpperCase().trim(),
              });
              if (redeemError) {
                toast({
                  title: 'ত্রুটি',
                  description: 'অবৈধ বা মেয়াদোত্তীর্ণ আমন্ত্রণ কোড',
                  variant: 'destructive',
                });
              } else {
                const ownerId = (redeemData as { farm_owner_id?: string } | null)?.farm_owner_id;
                if (ownerId) {
                  // Remove the auto-created farm so worker only sees owner's farm
                  await supabase.rpc('cleanup_worker_farm', {
                    _farm_owner_id: ownerId,
                  });
                }
              }
            } else if (userType === 'owner' && signupOrgId) {
              // Assign new owner's farm to the chosen organization
              const { error: assignError } = await supabase.rpc('assign_self_to_organization' as any, {
                _org_id: signupOrgId,
              });
              if (assignError) {
                toast({
                  title: 'সতর্কতা',
                  description: 'অর্গানাইজেশন বরাদ্দ ব্যর্থ — অ্যাডমিনকে জানান',
                  variant: 'destructive',
                });
              }
            }
          }

          navigate(nextPath);
        }
      }
    } catch {
      toast({ title: 'ত্রুটি', description: 'সংযোগ ত্রুটি', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    showPassword, setShowPassword,
    showConfirmPassword, setShowConfirmPassword,
    signupName, setSignupName,
    signupPhone, setSignupPhone,
    signupEmail, setSignupEmail,
    signupFarmName, setSignupFarmName,
    signupFarmType, setSignupFarmType,
    signupPassword, setSignupPassword,
    signupConfirmPassword, setSignupConfirmPassword,
    userType, setUserType,
    invitationCode, setInvitationCode,
    showOptionalEmail, setShowOptionalEmail,
    signupOrgId, setSignupOrgId,
    orgOptions,
    passwordStrength,
    handleSignup,
  };
}
