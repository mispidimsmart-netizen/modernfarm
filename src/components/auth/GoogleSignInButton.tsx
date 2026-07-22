import { useState } from 'react';
import { lovable } from '@/integrations/lovable';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

interface Props {
  /** Show "or" divider above */
  showDivider?: boolean;
  /** Relative same-origin path to return to after OAuth (e.g. "/.lovable/oauth/consent?..."). Defaults to "/". */
  nextPath?: string;
}

export function GoogleSignInButton({ showDivider = true, nextPath = '/' }: Props) {
  const { language } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';
      // Route back through /login so nextPath is consumed after the session hydrates.
      const returnTo = `${window.location.origin}/login?next=${encodeURIComponent(safeNext)}`;
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: returnTo,
      });
      if (result.error) {
        toast({
          title: language === 'bn' ? 'ত্রুটি' : 'Error',
          description: result.error.message || (language === 'bn' ? 'Google সাইন-ইন ব্যর্থ' : 'Google sign-in failed'),
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      // If redirected, browser will navigate away; otherwise session is set.
    } catch (e) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {showDivider && (
        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {language === 'bn' ? 'অথবা' : 'or'}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="h-12 w-full rounded-2xl border-2 border-border bg-background text-foreground font-semibold flex items-center justify-center gap-3 transition-all hover:bg-muted/50 active:scale-[0.98] disabled:opacity-60"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
        </svg>
        <span>
          {loading
            ? (language === 'bn' ? 'অপেক্ষা করুন...' : 'Please wait...')
            : (language === 'bn' ? 'Google দিয়ে চালিয়ে যান' : 'Continue with Google')}
        </span>
      </button>
    </div>
  );
}
