import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isPhoneInput, validatePhone } from '@/lib/authFormUtils';

/** Login + forgot-password state and handlers. */
export function useLoginForm(nextPath: string) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

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
        navigate(nextPath);
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
    showForgotPassword, setShowForgotPassword,
    forgotEmail, setForgotEmail,
    identifier, setIdentifier,
    loginPassword, setLoginPassword,
    handleLogin,
    handleForgotPassword,
  };
}
