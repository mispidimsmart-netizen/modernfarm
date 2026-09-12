import { CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const items = [
  { label: 'Onboarding Wizard (/setup)', done: true },
  { label: 'Offline-first PWA + Service Worker', done: true },
  { label: 'PWA Install Prompts (Android + iOS)', done: true },
  { label: 'Voice Commands (বাংলা)', done: true },
  { label: 'Training Videos (/training)', done: true },
  { label: 'Community Channels (/community)', done: true },
  { label: 'Accessibility — skip-link, focus rings, aria labels', done: true },
  { label: 'WCAG AA color contrast (semantic tokens)', done: true },
];

export function Phase8StatusCard() {
  const completed = items.filter((i) => i.done).length;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" /> Phase 8 — UX & Polish
          </span>
          <Badge variant="secondary">{completed}/{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5 text-sm">
          {items.map((it) => (
            <li key={it.label} className="flex items-center gap-2">
              {it.done ? (
                <CheckCircle2 size={16} className="text-primary shrink-0" />
              ) : (
                <Circle size={16} className="text-muted-foreground shrink-0" />
              )}
              <span className={it.done ? '' : 'text-muted-foreground'}>{it.label}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
