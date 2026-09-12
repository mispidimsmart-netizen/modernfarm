import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SMART_MODE_PROFILES, type SmartModeType } from '@/lib/smartModeProfiles';

// Re-exported for backward compatibility; canonical source is @/lib/smartModeProfiles
export { SMART_MODE_PROFILES };
export type { SmartModeType, SmartModeProfile } from '@/lib/smartModeProfiles';

export function useApplySmartMode() {
  const queryClient = useQueryClient();
  const { user, language } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (modeId: SmartModeType) => {
      if (!user) throw new Error('Not authenticated');
      
      const profile = SMART_MODE_PROFILES.find(p => p.id === modeId);
      if (!profile) throw new Error('Invalid mode');

      const { error } = await supabase
        .from('farm_settings')
        .update({
          ...profile.settings,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
      
      return profile;
    },
    onSuccess: (profile) => {
      queryClient.invalidateQueries({ queryKey: ['farm-settings'] });
      toast({
        title: profile.icon + ' ' + profile.name[language],
        description: language === 'bn' 
          ? 'সেটিংস সফলভাবে প্রয়োগ হয়েছে' 
          : 'Settings applied successfully',
      });
    },
    onError: (error) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
