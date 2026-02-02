import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Check, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAutomationStatus, AutomationRule, AutomationRuleStatus } from '@/hooks/useAutomationStatus';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

function getStatusColor(status: AutomationRuleStatus) {
  switch (status) {
    case 'triggered':
      return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700';
    case 'active':
      return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
    case 'disabled':
      return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700';
    default:
      return 'bg-muted/50 border-muted';
  }
}

function getStatusBadge(status: AutomationRuleStatus, language: 'bn' | 'en') {
  switch (status) {
    case 'triggered':
      return (
        <Badge variant="outline" className="bg-orange-500 text-white border-orange-500">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {language === 'bn' ? 'সক্রিয়' : 'Triggered'}
        </Badge>
      );
    case 'active':
      return (
        <Badge variant="outline" className="bg-green-500 text-white border-green-500">
          <Check className="h-3 w-3 mr-1" />
          {language === 'bn' ? 'চালু' : 'Active'}
        </Badge>
      );
    case 'disabled':
      return (
        <Badge variant="outline" className="bg-gray-500 text-white border-gray-500">
          <XCircle className="h-3 w-3 mr-1" />
          {language === 'bn' ? 'বন্ধ' : 'Disabled'}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          {language === 'bn' ? 'অপেক্ষায়' : 'Idle'}
        </Badge>
      );
  }
}

interface RuleItemProps {
  rule: AutomationRule;
  language: 'bn' | 'en';
  index: number;
}

function RuleItem({ rule, language, index }: RuleItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'rounded-lg border p-3',
        getStatusColor(rule.status)
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{rule.icon}</span>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {rule.name[language]}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {rule.description[language]}
            </p>
          </div>
        </div>
        {getStatusBadge(rule.status, language)}
      </div>
      
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {rule.currentValue}
        </span>
        <span className="text-primary font-medium">
          → {rule.action[language]}
        </span>
      </div>
    </motion.div>
  );
}

export function AutomationStatusCard() {
  const { language } = useAuth();
  const { rules, stats } = useAutomationStatus();

  const triggeredRules = rules.filter(r => r.status === 'triggered');
  const otherRules = rules.filter(r => r.status !== 'triggered');

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'অটোমেশন স্ট্যাটাস' : 'Automation Status'}
          </div>
          <Link to="/automation" className="text-xs text-primary flex items-center gap-1">
            {language === 'bn' ? 'সব দেখুন' : 'View All'}
            <ChevronRight className="h-3 w-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Stats Summary */}
        <div className="mb-4 grid grid-cols-4 gap-2">
          <div className="rounded-lg bg-muted/50 p-2 text-center">
            <p className="text-lg font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'মোট' : 'Total'}
            </p>
          </div>
          <div className="rounded-lg bg-orange-100 dark:bg-orange-900/30 p-2 text-center">
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats.triggered}</p>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'সক্রিয়' : 'Triggered'}
            </p>
          </div>
          <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2 text-center">
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{stats.active}</p>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'চালু' : 'Active'}
            </p>
          </div>
          <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-2 text-center">
            <p className="text-lg font-bold text-gray-600 dark:text-gray-400">{stats.disabled}</p>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'বন্ধ' : 'Off'}
            </p>
          </div>
        </div>

        {/* Triggered Rules (Priority) */}
        {triggeredRules.length > 0 && (
          <div className="mb-3 space-y-2">
            <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
              {language === 'bn' ? '⚡ সক্রিয় রুলস' : '⚡ Triggered Rules'}
            </p>
            {triggeredRules.map((rule, idx) => (
              <RuleItem key={rule.id} rule={rule} language={language} index={idx} />
            ))}
          </div>
        )}

        {/* Other Rules */}
        <div className="space-y-2">
          {triggeredRules.length > 0 && (
            <p className="text-xs font-medium text-muted-foreground">
              {language === 'bn' ? 'অন্যান্য রুলস' : 'Other Rules'}
            </p>
          )}
          {otherRules.slice(0, 3).map((rule, idx) => (
            <RuleItem key={rule.id} rule={rule} language={language} index={idx + triggeredRules.length} />
          ))}
          {otherRules.length > 3 && (
            <p className="text-xs text-center text-muted-foreground py-1">
              +{otherRules.length - 3} {language === 'bn' ? 'আরও' : 'more'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
