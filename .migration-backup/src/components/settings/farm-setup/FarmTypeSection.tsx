import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { FARM_TYPES } from '@/data/farmSetupOptions';
import type { FarmType } from '@/lib/farmSetup';

interface FarmTypeSectionProps {
  language: 'bn' | 'en';
  farmType: FarmType;
  selectedShed?: { name: string; name_en: string } | any;
  onChange: (t: FarmType) => void;
}

export function FarmTypeSection({ language, farmType, selectedShed, onChange }: FarmTypeSectionProps) {
  return (
    <>
      <p className="text-sm text-muted-foreground mb-3">
        {language === 'bn'
          ? selectedShed
            ? `"${selectedShed.name}" শেডের জন্য — প্রতিটি শেডে ভিন্ন ধরণ থাকতে পারে`
            : 'শেড সিলেক্ট করে প্রতিটি শেডের ধরণ আলাদা করুন'
          : selectedShed
            ? `For "${selectedShed.name_en}" — each shed can have a different type`
            : 'Select a shed to set its type individually'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {FARM_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = farmType === type.id;
          return (
            <motion.button
              key={type.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(type.id)}
              className={`relative rounded-xl p-4 text-left transition-all ${
                isSelected
                  ? `${type.bgColor} border-2 border-current ${type.color} shadow-md`
                  : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
              }`}
            >
              {isSelected && (
                <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                  <Check className="h-3.5 w-3.5" />
                </div>
              )}
              <Icon className={`h-8 w-8 mb-2 ${isSelected ? type.color : 'text-muted-foreground'}`} />
              <p className="font-semibold">{type.name[language]}</p>
              <p className="text-xs text-muted-foreground">{type.description[language]}</p>
            </motion.button>
          );
        })}
      </div>
    </>
  );
}
