import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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

const VALID_LANGUAGES: Language[] = ['bn', 'en'];
const LANG_STORAGE_KEY = 'farmeye_language';

function getValidLanguage(stored: string | null): Language {
  if (stored && (VALID_LANGUAGES as string[]).includes(stored)) {
    return stored as Language;
  }
  return 'bn';
}

function loadLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return getValidLanguage(stored);
  } catch {
    return 'bn';
  }
}

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
  const [language, setLanguageRaw] = useState<Language>(loadLanguage);
  const { toast } = useToast();

  // Safe language setter with localStorage persistence and validation
  const setLanguage = useCallback((lang: Language) => {
    const valid = getValidLanguage(lang);
    setLanguageRaw(valid);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, valid);
    } catch {
      // localStorage may be unavailable in some environments
    }
  }, []);

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

  // Always phone-primary signup with synthetic email
  const signUp = async (phone: string, password: string, metadata?: SignUpMetadata) => {
    try {
      const email = phoneToEmail(phone);
      const formattedPhone = formatPhoneNumber(phone);
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            farm_name: metadata?.farmName || 'আমার লেয়ার ফার্ম',
            phone: formattedPhone,
            farm_type: metadata?.farmType || null,
            user_name: metadata?.userName || null,
            real_email: metadata?.realEmail || null,
            auth_method: 'phone',
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered') || error.message.includes('already been registered')) {
          return { error: new Error(language === 'bn' 
            ? 'এই নম্বর দিয়ে আগেই অ্যাকাউন্ট তৈরি করা হয়েছে'
            : 'An account with this phone already exists') 
          };
        }
        return { error };
      }

      toast({
        title: language === 'bn' ? 'সফল!' : 'Success!',
        description: language === 'bn' 
          ? 'অ্যাকাউন্ট তৈরি হয়েছে।' 
          : 'Account created.',
      });

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Unified login: auto-detect phone vs email
  const signIn = async (identifier: string, password: string) => {
    try {
      // Auto-detect phone vs email
      const cleaned = identifier.replace(/\D/g, '');
      const isPhone = cleaned.length >= 6 && /^0?1\d+$/.test(cleaned);

      const primaryEmail = isPhone ? phoneToEmail(identifier) : identifier;

      const attempt = async (email: string) => {
        return await supabase.auth.signInWithPassword({ email, password });
      };

      let { error } = await attempt(primaryEmail);

      // If login failed, try resolving via backend
      if (error?.message?.includes('Invalid login credentials')) {
        const body = isPhone ? { phone: identifier } : { email: identifier };
        const { data } = await supabase.functions.invoke('lookup-login-identifier', { body });

        const resolvedEmail = (data as { email?: string | null } | null)?.email ?? null;
        if (resolvedEmail && resolvedEmail !== primaryEmail) {
          ({ error } = await attempt(resolvedEmail));
        }
      }

      if (error) {
        // Audit log: failed login (no user_id since auth failed)
        supabase.rpc('log_security_event', {
          _event_type: 'login_failure',
          _success: false,
          _details: {
            identifier_type: isPhone ? 'phone' : 'email',
            reason: error.message.includes('Invalid login credentials') ? 'invalid_credentials'
              : error.message.includes('Email not confirmed') ? 'email_not_confirmed'
              : 'other',
          },
        }).then(() => {}, () => {});

        if (error.message.includes('Invalid login credentials')) {
          return { error: new Error(language === 'bn' 
            ? 'ভুল মোবাইল নম্বর/ইমেইল বা পাসওয়ার্ড'
            : 'Invalid phone/email or password') 
          };
        }
        if (error.message.includes('Email not confirmed')) {
          return { error: new Error(language === 'bn' ? 'অনুগ্রহ করে আপনার ইমেইল যাচাই করুন' : 'Please verify your email first') };
        }
        return { error };
      }

      // Audit log: successful login
      const { data: { user: signedInUser } } = await supabase.auth.getUser();
      if (signedInUser) {
        supabase.rpc('log_security_event', {
          _event_type: 'login_success',
          _user_id: signedInUser.id,
          _success: true,
          _details: { identifier_type: isPhone ? 'phone' : 'email' },
        }).then(() => {}, () => {});
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

const noopAuth: AuthContextType = {
  user: null,
  session: null,
  isLoading: false,
  language: 'bn',
  setLanguage: () => {},
  signUp: async () => ({ error: new Error('AuthProvider not mounted') }),
  signIn: async () => ({ error: new Error('AuthProvider not mounted') }),
  signOut: async () => {},
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Fallback: avoid crashing components rendered outside the provider tree.
    if (import.meta.env.DEV) {
      console.warn('useAuth called outside AuthProvider — using safe defaults (lang=bn).');
    }
    return noopAuth;
  }
  return context;
}
