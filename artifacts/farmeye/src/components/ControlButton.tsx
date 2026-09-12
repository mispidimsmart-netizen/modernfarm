import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ControlButtonProps {
  icon: LucideIcon;
  label: string;
  isOn: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function ControlButton({ icon: Icon, label, isOn, onToggle, disabled }: ControlButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'control-button min-h-[120px] w-full',
        isOn ? 'control-button-on' : 'control-button-off',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <motion.div
        animate={{ scale: isOn ? 1.1 : 1 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <Icon size={36} />
      </motion.div>
      <span className="text-base font-semibold">{label}</span>
      <span className={cn(
        'rounded-full px-3 py-1 text-xs font-medium',
        isOn 
          ? 'bg-white/20 text-primary-foreground' 
          : 'bg-foreground/10 text-muted-foreground'
      )}>
        {isOn ? 'ON' : 'OFF'}
      </span>
    </motion.button>
  );
}
