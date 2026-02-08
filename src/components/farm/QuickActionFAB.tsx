import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Egg, Wheat, Skull, Wallet, CalendarClock, Scale, Drumstick } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmType } from '@/hooks/useFarmType';

interface QuickActionFABProps {
  onAction: (action: 'egg' | 'feed' | 'mortality' | 'finance' | 'schedule' | 'batch' | 'weight' | 'broiler-feed') => void;
}

export function QuickActionFAB({ onAction }: QuickActionFABProps) {
  const { language } = useAuth();
  const { isLayer, isBroiler } = useFarmType();
  const [isOpen, setIsOpen] = useState(false);

  // Layer-specific actions
  const layerActions = [
    { 
      key: 'egg' as const, 
      icon: Egg, 
      label: language === 'bn' ? 'ডিম' : 'Eggs',
      color: 'bg-primary hover:bg-primary/90',
    },
    { 
      key: 'feed' as const, 
      icon: Wheat, 
      label: language === 'bn' ? 'খাদ্য' : 'Feed',
      color: 'bg-green-600 hover:bg-green-700',
    },
    { 
      key: 'mortality' as const, 
      icon: Skull, 
      label: language === 'bn' ? 'মৃত্যু' : 'Mortality',
      color: 'bg-destructive hover:bg-destructive/90',
    },
    { 
      key: 'finance' as const, 
      icon: Wallet, 
      label: language === 'bn' ? 'হিসাব' : 'Finance',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    { 
      key: 'schedule' as const, 
      icon: CalendarClock, 
      label: language === 'bn' ? 'শিডিউল' : 'Schedule',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
  ];

  // Broiler-specific actions
  const broilerActions = [
    { 
      key: 'batch' as const, 
      icon: Drumstick, 
      label: language === 'bn' ? 'ব্যাচ' : 'Batch',
      color: 'bg-orange-600 hover:bg-orange-700',
    },
    { 
      key: 'weight' as const, 
      icon: Scale, 
      label: language === 'bn' ? 'ওজন' : 'Weight',
      color: 'bg-primary hover:bg-primary/90',
    },
    { 
      key: 'broiler-feed' as const, 
      icon: Wheat, 
      label: language === 'bn' ? 'খাদ্য' : 'Feed',
      color: 'bg-green-600 hover:bg-green-700',
    },
    { 
      key: 'mortality' as const, 
      icon: Skull, 
      label: language === 'bn' ? 'মৃত্যু' : 'Mortality',
      color: 'bg-destructive hover:bg-destructive/90',
    },
    { 
      key: 'finance' as const, 
      icon: Wallet, 
      label: language === 'bn' ? 'হিসাব' : 'Finance',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
  ];

  // Select actions based on farm type
  const actions = useMemo(() => {
    return isBroiler ? broilerActions : layerActions;
  }, [isBroiler, language]);

  const handleAction = (action: 'egg' | 'feed' | 'mortality' | 'finance' | 'schedule' | 'batch' | 'weight' | 'broiler-feed') => {
    setIsOpen(false);
    onAction(action);
  };

  return (
    <div className="fixed bottom-24 right-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Action buttons */}
            <div className="absolute bottom-16 right-0 flex flex-col-reverse gap-3">
              {actions.map((action, index) => (
                <motion.button
                  key={action.key}
                  initial={{ opacity: 0, scale: 0.3, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.3, y: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleAction(action.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-white shadow-lg ${action.color} transition-colors`}
                >
                  <action.icon size={18} />
                  <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all ${
          isOpen 
            ? 'bg-muted-foreground rotate-45' 
            : 'bg-primary hover:bg-primary/90'
        }`}
      >
        {isOpen ? (
          <X size={24} className="text-white" />
        ) : (
          <Plus size={24} className="text-primary-foreground" />
        )}
      </motion.button>
    </div>
  );
}
