import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Egg, Wheat, Skull, Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface QuickActionFABProps {
  onAction: (action: 'egg' | 'feed' | 'mortality' | 'finance') => void;
}

export function QuickActionFAB({ onAction }: QuickActionFABProps) {
  const { language } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
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
  ];

  const handleAction = (action: 'egg' | 'feed' | 'mortality' | 'finance') => {
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
