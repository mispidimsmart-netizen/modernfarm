import { Bird, Lightbulb, Check, AlertTriangle, ArrowRight, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAgeLightingSuggestion } from '@/hooks/useAgeLightingSuggestion';
import { useBirdAge } from '@/hooks/useBirdAge';
import { useUpdateLightingSchedule } from '@/hooks/useLightingCurve';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function AgeLightingSuggestionCard() {
  const { language } = useAuth();
  const { ageWeeks, hasValue } = useBirdAge();
  const suggestion = useAgeLightingSuggestion();
  const updateSchedule = useUpdateLightingSchedule();

  const t = {
    title: { bn: 'বয়স অনুযায়ী লাইটিং সাজেশন', en: 'Age-Based Lighting Suggestion' },
    currentAge: { bn: 'বর্তমান বয়স', en: 'Current Age' },
    weeks: { bn: 'সপ্তাহ', en: 'weeks' },
    recommended: { bn: 'সুপারিশ', en: 'Recommended' },
    hours: { bn: 'ঘন্টা', en: 'hours' },
    optimal: { bn: 'অপটিমাল', en: 'Optimal' },
    notOptimal: { bn: 'সমন্বয় প্রয়োজন', en: 'Needs Adjustment' },
    apply: { bn: 'এই সেটিং প্রয়োগ করুন', en: 'Apply This Setting' },
    enterAge: { bn: 'প্রথমে মুরগির বয়স ইনপুট করুন', en: 'Enter flock age first' },
    deviation: { bn: 'বর্তমান থেকে পার্থক্য', en: 'Deviation from current' },
  };

  if (!suggestion || !hasValue) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Bird className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t.enterAge[language]}
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleApply = () => {
    updateSchedule.mutate({
      start_time: suggestion.recommendedStartTime,
      end_time: suggestion.recommendedEndTime,
    });
  };

  const phaseColors: Record<string, string> = {
    brooding: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    growing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'pre-lay': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    production: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bird className="h-5 w-5 text-primary" />
            {t.title[language]}
          </CardTitle>
          <Badge className={phaseColors[suggestion.phase]}>
            {suggestion.phaseLabel[language]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Age & Recommendation */}
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {ageWeeks}
            </div>
            <div className="text-xs text-muted-foreground">
              {t.weeks[language]}
            </div>
          </div>
          
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          
          <div className="text-center">
            <div className="flex items-center gap-1">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">
                {suggestion.recommendedHours}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {t.hours[language]} {t.recommended[language]}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {suggestion.recommendedStartTime} - {suggestion.recommendedEndTime}
              </span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {suggestion.isOptimal ? (
            <Badge variant="outline" className="border-green-500 text-green-600">
              <Check className="mr-1 h-3 w-3" />
              {t.optimal[language]}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-orange-500 text-orange-600">
              <AlertTriangle className="mr-1 h-3 w-3" />
              {t.notOptimal[language]} ({suggestion.deviation > 0 ? '+' : ''}{suggestion.deviation} {t.hours[language]})
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground">
          {suggestion.description[language]}
        </p>

        {/* Tips */}
        {suggestion.tips.length > 0 && (
          <div className="space-y-1.5">
            {suggestion.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{tip[language]}</span>
              </div>
            ))}
          </div>
        )}

        {/* Apply Button */}
        {!suggestion.isOptimal && (
          <Button 
            onClick={handleApply} 
            className="w-full"
            disabled={updateSchedule.isPending}
          >
            <Lightbulb className="mr-2 h-4 w-4" />
            {t.apply[language]}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
