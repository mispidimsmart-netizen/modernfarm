import { ChevronDown, ChevronUp, Info, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MODULE_EXPLANATIONS } from './automationSettingsConstants';
import type { AutomationSection } from './buildAutomationSections';

interface Props {
  section: AutomationSection;
  language: 'bn' | 'en';
  isOpen: boolean;
  onOpenChange: () => void;
  onToggle: (value: boolean) => void;
}

export function AutomationSectionRow({ section, language, isOpen, onOpenChange, onToggle }: Props) {
  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <div className="flex items-center gap-3 py-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${section.bgColor}`}>
          <section.icon className={`h-4 w-4 ${section.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate">{section.title}</p>
            {section.isCritical && <ShieldAlert size={12} className="text-amber-500 shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground truncate">{section.description}</p>
        </div>
        {section.onToggle && <Switch checked={section.enabled} onCheckedChange={onToggle} />}
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="pl-12">
        {MODULE_EXPLANATIONS[section.id] && (
          <div className="flex items-start gap-2 mb-3 rounded-lg bg-muted/50 p-2.5">
            <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">{MODULE_EXPLANATIONS[section.id][language]}</p>
          </div>
        )}
        {section.content}
      </CollapsibleContent>
    </Collapsible>
  );
}
