import { motion } from 'framer-motion';
import { Shield, Wind, Thermometer, Flame } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SafetyProtection {
  key: string;
  icon: React.ElementType;
  name: { bn: string; en: string };
  description: { bn: string; en: string };
  isActive: boolean;
}

interface SafetyLockedDevicesProps {
  protections: SafetyProtection[];
}

export function SafetyLockedDevices({ protections }: SafetyLockedDevicesProps) {
  const { language } = useAuth();

  const activeProtections = protections.filter(p => p.isActive);

  if (activeProtections.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-emerald-500" />
            {language === 'bn' ? 'সুরক্ষা সক্রিয়' : 'Safety Protections Active'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeProtections.map((protection) => {
            const Icon = protection.icon;
            return (
              <div
                key={protection.key}
                className="flex items-center gap-3 rounded-xl bg-background/50 p-2.5 border border-emerald-500/20"
              >
                <div className="p-1.5 rounded-lg bg-emerald-500/20">
                  <Icon className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{protection.name[language]}</p>
                  <p className="text-xs text-muted-foreground">{protection.description[language]}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {language === 'bn' ? 'সক্রিয়' : 'Active'}
                </div>
              </div>
            );
          })}
          
          <p className="text-xs text-muted-foreground text-center pt-2">
            {language === 'bn' 
              ? '🔒 এই সুরক্ষাগুলো ম্যানুয়ালি বন্ধ করা যাবে না'
              : '🔒 These protections cannot be manually disabled'}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Default safety protections
export const DEFAULT_SAFETY_PROTECTIONS: SafetyProtection[] = [
  {
    key: 'min_ventilation',
    icon: Wind,
    name: { bn: 'মিনিমাম ভেন্টিলেশন', en: 'Minimum Ventilation' },
    description: { bn: 'অ্যামোনিয়া ও গ্যাস পরিষ্কার রাখে', en: 'Keeps ammonia & gases clear' },
    isActive: true,
  },
  {
    key: 'heat_stress',
    icon: Thermometer,
    name: { bn: 'হিট স্ট্রেস সুরক্ষা', en: 'Heat Stress Protection' },
    description: { bn: 'তাপমাত্রা বেশি হলে কুলিং চালু করে', en: 'Activates cooling when too hot' },
    isActive: true,
  },
  {
    key: 'gas_purge',
    icon: Wind,
    name: { bn: 'গ্যাস পার্জ ভেন্টিলেশন', en: 'Gas Purge Ventilation' },
    description: { bn: 'অ্যামোনিয়া ২৫+ হলে জরুরি ভেন্টিলেশন', en: 'Emergency vent when ammonia > 25' },
    isActive: true,
  },
];
