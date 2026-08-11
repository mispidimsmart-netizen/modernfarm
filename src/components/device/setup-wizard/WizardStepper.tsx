import { CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Settings as SettingsIcon } from 'lucide-react';
import { STEPS } from './wizardConstants';

export function WizardStepper({ stepIdx, progress }: { stepIdx: number; progress: number }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <SettingsIcon className="h-4 w-4 text-primary" />
          ডিভাইস সেটআপ উইজার্ড
        </CardTitle>
        <Progress value={progress} className="h-1.5 mt-2" />
        <div className="flex justify-between mt-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === stepIdx;
            const done = i < stepIdx;
            return (
              <div key={s.key} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center border-2 ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : done
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span
                  className={`text-[10px] text-center ${active ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardHeader>
    </Card>
  );
}
