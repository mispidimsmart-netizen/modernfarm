import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';

interface SignUpMetadata {
  farmName?: string;
  farmType?: string;
  userName?: string;
  realEmail?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
  signUp: (phone: string, password: string, metadata?: SignUpMetadata) => Promise<{ error: Error | null }>;
  signIn: (identifier: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to format phone number for Supabase (needs +880 format for Bangladesh)
const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with +880
  if (cleaned.startsWith('0')) {
    cleaned = '880' + cleaned.substring(1);
  }
  
  // If doesn't start with 880, add it
  if (!cleaned.startsWith('880')) {
    cleaned = '880' + cleaned;
  }
  
  return '+' + cleaned;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('bn');
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Convert phone to synthetic email for auth (since SMS provider not configured)
  const phoneToEmail = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    // Normalize: remove leading 0 or 880
    let normalized = cleaned;
    if (normalized.startsWith('880')) {
      normalized = normalized.substring(3);
    }
    if (normalized.startsWith('0')) {
      normalized = normalized.substring(1);
    }
    return `${normalized}@phone.layerfarm.app`;
  };

  const signUp = async (identifier: string, password: string, farmName?: string, isPhone?: boolean) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // For phone auth, use synthetic email approach since SMS provider is not configured
      const email = isPhone ? phoneToEmail(identifier) : identifier;
      const formattedPhone = isPhone ? formatPhoneNumber(identifier) : null;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            farm_name: farmName || 'আমার লেয়ার ফার্ম',
            phone: formattedPhone,
            auth_method: isPhone ? 'phone' : 'email',
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered') || error.message.includes('already been registered')) {
          return { error: new Error(language === 'bn' 
            ? (isPhone ? 'এই নম্বর দিয়ে আগেই অ্যাকাউন্ট তৈরি করা হয়েছে' : 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট তৈরি করা হয়েছে') 
            : (isPhone ? 'An account with this phone already exists' : 'An account with this email already exists')) 
          };
        }
        return { error };
      }

      toast({
        title: language === 'bn' ? 'সফল!' : 'Success!',
        description: language === 'bn' 
          ? 'অ্যাকাউন্ট তৈরি হয়েছে। এখন লগইন করুন।' 
          : 'Account created. You can now login.',
      });

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (identifier: string, password: string, isPhone?: boolean) => {
    try {
      // For phone auth, try synthetic email first; if it fails and this user actually
      // registered with email, resolve phone->email via backend and retry.
      const primaryEmail = isPhone ? phoneToEmail(identifier) : identifier;

      const attempt = async (email: string) => {
        return await supabase.auth.signInWithPassword({ email, password });
      };

      let { error } = await attempt(primaryEmail);

      if (isPhone && error?.message?.includes('Invalid login credentials')) {
        // Resolve phone to email for accounts created via email but with phone saved in profile.
        const { data } = await supabase.functions.invoke('lookup-login-identifier', {
          body: { phone: identifier },
        });

        const resolvedEmail = (data as { email?: string | null } | null)?.email ?? null;
        if (resolvedEmail && resolvedEmail !== primaryEmail) {
          ({ error } = await attempt(resolvedEmail));
        }
      }

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { error: new Error(language === 'bn' 
            ? (isPhone ? 'ভুল মোবাইল নম্বর বা পাসওয়ার্ড' : 'ভুল ইমেইল বা পাসওয়ার্ড') 
            : (isPhone ? 'Invalid phone or password' : 'Invalid email or password')) 
          };
        }
        if (error.message.includes('Email not confirmed')) {
          return { error: new Error(language === 'bn' ? 'অনুগ্রহ করে আপনার ইমেইল যাচাই করুন' : 'Please verify your email first') };
        }
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        language,
        setLanguage,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
