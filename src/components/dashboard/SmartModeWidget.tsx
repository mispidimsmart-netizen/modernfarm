import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { 
  SMART_MODE_PROFILES, 
  useApplySmartMode,
  SmartModeType 
} from '@/hooks/useSmartModeProfiles';
import { useToast } from '@/hooks/use-toast';

export function SmartModeWidget() {
  const { language } = useAuth();
  const applyMode = useApplySmartMode();
  const { toast } = useToast();

  // Quick access modes (excluding normal)
  const quickModes = SMART_MODE_PROFILES.filter(p => p.id !== 'normal').slice(0, 4);

  const handleQuickMode = (modeId: SmartModeType) => {
    const profile = SMART_MODE_PROFILES.find(p => p.id === modeId);
    if (!profile) return;

    toast({
      title: language === 'bn' ? 'মোড পরিবর্তন হচ্ছে...' : 'Changing mode...',
      description: profile.name[language],
    });

    applyMode.mutate(modeId);
  };

  return (
    <div className="rounded-2xl bg-card p-4 shadow-card">
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">
        {language === 'bn' ? '⚡ কুইক মোড' : '⚡ Quick Mode'}
      </h3>
      
      <div className="flex gap-2 overflow-x-auto pb-1">
        {quickModes.map((profile) => (
          <motion.button
            key={profile.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleQuickMode(profile.id)}
            disabled={applyMode.isPending}
            className={`flex shrink-0 flex-col items-center gap-1 rounded-xl px-4 py-3 transition-all ${profile.bgColor} hover:ring-2 hover:ring-primary/30 disabled:opacity-50`}
          >
            <span className="text-2xl">{profile.icon}</span>
            <span className={`text-xs font-medium ${profile.color}`}>
              {profile.name[language].split(' ')[0]}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
