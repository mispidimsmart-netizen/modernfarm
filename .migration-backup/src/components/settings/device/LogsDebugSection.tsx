import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Activity, AlertTriangle, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';

interface Props {
  language: string;
  showEventLogs: boolean;
  setShowEventLogs: (v: boolean) => void;
  showErrorLogs: boolean;
  setShowErrorLogs: (v: boolean) => void;
  eventLogs?: any[];
  errorLogs?: any[];
  refetchEventLogs: () => void;
  refetchErrorLogs: () => void;
}

function LogRow({ log, language, dangerOnly }: { log: any; language: string; dangerOnly?: boolean }) {
  const tone = dangerOnly
    ? 'bg-destructive/10 border border-destructive/20'
    : log.severity === 'danger'
      ? 'bg-destructive/10 border border-destructive/20'
      : log.severity === 'warning'
        ? 'bg-yellow-500/10 border border-yellow-500/20'
        : 'bg-muted/50 border border-border';

  return (
    <div className={`rounded-lg p-3 text-sm ${tone}`}>
      <div className="flex items-center justify-between mb-1">
        <Badge variant={dangerOnly || log.severity === 'danger' ? 'destructive' : 'secondary'} className="text-xs">
          {log.alert_type}
        </Badge>
        <span className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}</span>
      </div>
      <p className="text-foreground">{language === 'bn' ? log.message_bn : log.message}</p>
    </div>
  );
}

/** Debug toggle plus the event/error log sheets. */
export function LogsDebugSection({
  language,
  showEventLogs,
  setShowEventLogs,
  showErrorLogs,
  setShowErrorLogs,
  eventLogs,
  errorLogs,
  refetchEventLogs,
  refetchErrorLogs,
}: Props) {
  const { toast } = useToast();
  const [debugMode, setDebugMode] = useState(() => localStorage.getItem('farmeye_debug_mode') === 'true');

  useEffect(() => {
    localStorage.setItem('farmeye_debug_mode', String(debugMode));
    if (debugMode) console.log('[FarmEye Debug] Debug mode enabled');
  }, [debugMode]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label>{language === 'bn' ? 'ডিবাগ মোড' : 'Debug Mode'}</Label>
          <p className="text-xs text-muted-foreground">
            {language === 'bn' ? 'বিস্তারিত লগ দেখুন' : 'View detailed logs'}
          </p>
        </div>
        <Switch
          checked={debugMode}
          onCheckedChange={(checked) => {
            setDebugMode(checked);
            toast({
              title: checked
                ? language === 'bn'
                  ? 'ডিবাগ মোড চালু'
                  : 'Debug Mode Enabled'
                : language === 'bn'
                  ? 'ডিবাগ মোড বন্ধ'
                  : 'Debug Mode Disabled',
              description: checked
                ? language === 'bn'
                  ? 'কনসোলে বিস্তারিত লগ দেখা যাবে'
                  : 'Detailed logs will appear in console'
                : language === 'bn'
                  ? 'লগিং বন্ধ করা হয়েছে'
                  : 'Logging has been disabled',
            });
          }}
        />
      </div>

      {debugMode && (
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">
              {language === 'bn' ? 'ডিবাগ মোড সক্রিয়' : 'Debug Mode Active'}
            </span>
          </div>
          <p>
            {language === 'bn'
              ? 'ব্রাউজার কনসোলে [FarmEye Debug] প্রিফিক্স সহ বিস্তারিত লগ দেখুন'
              : 'Check browser console for detailed logs with [FarmEye Debug] prefix'}
          </p>
        </div>
      )}

      <Sheet open={showEventLogs} onOpenChange={setShowEventLogs}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setShowEventLogs(true);
              refetchEventLogs();
            }}
          >
            <FileCode className="mr-2 h-4 w-4" />
            {language === 'bn' ? 'ইভেন্ট লগ দেখুন' : 'View Event Logs'}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              {language === 'bn' ? 'ইভেন্ট লগ' : 'Event Logs'}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100%-60px)] mt-4">
            {eventLogs && eventLogs.length > 0 ? (
              <div className="space-y-2">
                {eventLogs.map((log) => (
                  <LogRow key={log.id} log={log} language={language} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <FileCode className="h-12 w-12 mb-2 opacity-50" />
                <p>{language === 'bn' ? 'কোনো ইভেন্ট নেই' : 'No events found'}</p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Sheet open={showErrorLogs} onOpenChange={setShowErrorLogs}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setShowErrorLogs(true);
              refetchErrorLogs();
            }}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            {language === 'bn' ? 'এরর লগ দেখুন' : 'View Error Logs'}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {language === 'bn' ? 'এরর লগ' : 'Error Logs'}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100%-60px)] mt-4">
            {errorLogs && errorLogs.length > 0 ? (
              <div className="space-y-2">
                {errorLogs.map((log) => (
                  <LogRow key={log.id} log={log} language={language} dangerOnly />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mb-2 opacity-50" />
                <p>{language === 'bn' ? 'কোনো এরর নেই' : 'No errors found'}</p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
