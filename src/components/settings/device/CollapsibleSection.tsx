import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface CollapsibleSectionProps {
  title: string;
  titleBn: string;
  icon: React.ElementType;
  /** Tailwind classes for the icon chip (background + foreground token). */
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  language: string;
}

/** Shared accordion card used by every Device & System settings section. */
export function CollapsibleSection({
  title,
  titleBn,
  icon: Icon,
  color,
  children,
  defaultOpen = false,
  language,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="font-semibold">{language === 'bn' ? titleBn : title}</span>
            </div>
            <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-4">{children}</div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
