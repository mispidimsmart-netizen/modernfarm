import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
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

  // Enhanced color schemes for each mode
  const modeStyles: Record<string, { gradient: string; glow: string; textColor: string }> = {
    summer: { 
      gradient: 'from-orange-500 via-amber-500 to-yellow-500', 
      glow: 'shadow-orange-500/40 hover:shadow-orange-500/60', 
      textColor: 'text-white' 
    },
    winter: { 
      gradient: 'from-blue-500 via-cyan-500 to-sky-500', 
      glow: 'shadow-blue-500/40 hover:shadow-blue-500/60', 
      textColor: 'text-white' 
    },
    rainy: { 
      gradient: 'from-indigo-500 via-purple-500 to-violet-500', 
      glow: 'shadow-indigo-500/40 hover:shadow-indigo-500/60', 
      textColor: 'text-white' 
    },
    emergency: { 
      gradient: 'from-red-600 via-rose-600 to-pink-600', 
      glow: 'shadow-red-500/50 hover:shadow-red-500/70', 
      textColor: 'text-white' 
    },
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 shadow-xl border border-slate-700/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-white">
          {language === 'bn' ? 'কুইক মোড' : 'Quick Mode'}
        </h3>
      </div>
      
      {/* Mode Buttons Grid */}
      <div className="grid grid-cols-4 gap-2">
        {quickModes.map((profile, index) => {
          const style = modeStyles[profile.id] || { gradient: 'from-gray-500 to-gray-600', glow: '', textColor: 'text-white' };
          
          return (
            <motion.button
              key={profile.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.08, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleQuickMode(profile.id)}
              disabled={applyMode.isPending}
              className={`relative flex flex-col items-center gap-2 rounded-2xl px-2 py-4 transition-all duration-300 bg-gradient-to-br ${style.gradient} shadow-lg ${style.glow} disabled:opacity-50 border border-white/20 overflow-hidden group`}
            >
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/0 via-white/5 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {/* Icon */}
              <span className="text-3xl drop-shadow-lg relative z-10">{profile.icon}</span>
              
              {/* Label */}
              <span className={`text-[10px] font-bold uppercase tracking-wider ${style.textColor} relative z-10`}>
                {profile.name[language].split(' ')[0]}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
