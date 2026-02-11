import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, History, ShieldCheck, Eye, AlertCircle, Moon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAcknowledgeAlert } from '@/hooks/useFarmData';
import { useSmartAlerts } from '@/hooks/useSmartAlerts';
import { translations } from '@/lib/translations';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { IndustrialAlertCard } from '@/components/alerts/IndustrialAlertCard';
import { AlertTimeline } from '@/components/alerts/AlertTimeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SmartAlert } from '@/hooks/useSmartAlerts';

// Group alerts into priority categories
function groupByPriority(alerts: SmartAlert[]) {
  const critical: SmartAlert[] = [];
  const attention: SmartAlert[] = [];
  const safeInfo: SmartAlert[] = [];

  alerts.forEach(alert => {
    if (alert.level === 'danger') {
      critical.push(alert);
    } else if (alert.level === 'warning') {
      attention.push(alert);
    } else {
      safeInfo.push(alert);
    }
  });

  return { critical, attention, safeInfo };
}

export function AlertsPage() {
  const { language } = useAuth();
  const { activeAlerts, resolvedAlerts, alertCounts, isQuietHours } = useSmartAlerts();
  const acknowledgeAlert = useAcknowledgeAlert();

  const handleAcknowledge = (id: string) => {
    acknowledgeAlert.mutate(id);
  };

  const { critical, attention, safeInfo } = groupByPriority(activeAlerts);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="page-container px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">{translations.alerts.title[language]}</h2>
            
            {alertCounts.total > 0 && (
              <div className="flex items-center gap-2">
                {alertCounts.danger > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300">
                    <AlertCircle size={12} />
                    {alertCounts.danger}
                  </span>
                )}
                {alertCounts.warning > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                    <Eye size={12} />
                    {alertCounts.warning}
                  </span>
                )}
                {alertCounts.info > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                    <ShieldCheck size={12} />
                    {alertCounts.info}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quiet hours */}
          {isQuietHours && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <Moon size={16} />
              <span>
                {language === 'bn' 
                  ? 'রাতের শান্ত মোড চালু — শুধু জরুরি বিষয়ে শব্দ হবে' 
                  : 'Quiet hours active — only critical alerts will sound'}
              </span>
            </div>
          )}

          <Tabs defaultValue="active" className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Bell size={16} />
                {language === 'bn' ? 'নতুন' : 'Active'}
                {alertCounts.total > 0 && (
                  <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-xs text-destructive-foreground">
                    {alertCounts.total}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History size={16} />
                {language === 'bn' ? 'ইতিহাস' : 'History'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {activeAlerts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle size={40} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-lg font-medium text-foreground">
                    {language === 'bn' ? 'সব ঠিক আছে!' : 'All Clear!'}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {language === 'bn' 
                      ? 'কোনো সতর্কতা নেই — খামার স্বাভাবিক চলছে' 
                      : 'No alerts — farm is running normally'}
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-5">
                  {/* CRITICAL (Red) */}
                  {critical.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={14} className="text-red-500" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                          {language === 'bn' ? 'জরুরি — দ্রুত দেখুন' : 'Critical — Act Now'}
                        </h3>
                      </div>
                      <div className="space-y-3">
                        <AnimatePresence>
                          {critical.map(alert => (
                            <IndustrialAlertCard key={alert.id} alert={alert} onAcknowledge={handleAcknowledge} />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* WARNING (Yellow) */}
                  {attention.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Eye size={14} className="text-amber-500" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          {language === 'bn' ? 'দেখে নিন — খামার নিরাপদ' : 'Check — Farm is Safe'}
                        </h3>
                      </div>
                      <div className="space-y-3">
                        <AnimatePresence>
                          {attention.map(alert => (
                            <IndustrialAlertCard key={alert.id} alert={alert} onAcknowledge={handleAcknowledge} />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* SAFE INFO (Blue) */}
                  {safeInfo.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck size={14} className="text-blue-500" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          {language === 'bn' ? 'তথ্য — সিস্টেম নিজে সামলেছে' : 'Info — Auto-Handled'}
                        </h3>
                      </div>
                      <div className="space-y-3">
                        <AnimatePresence>
                          {safeInfo.map(alert => (
                            <IndustrialAlertCard key={alert.id} alert={alert} onAcknowledge={handleAcknowledge} />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Farmer confidence footer */}
              <div className="mt-6 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-center">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  {language === 'bn' 
                    ? '🛡️ বেশিরভাগ সমস্যা সিস্টেম নিজেই ঠিক করে'
                    : '🛡️ Most issues are auto-resolved by the system'}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <AlertTimeline alerts={resolvedAlerts} />
              
              {/* Footer for history tab too */}
              <div className="mt-6 rounded-xl bg-muted/30 border border-border px-4 py-3 text-center">
                <p className="text-xs font-medium text-muted-foreground">
                  {language === 'bn' 
                    ? '🛡️ বেশিরভাগ সমস্যা সিস্টেম নিজেই ঠিক করে'
                    : '🛡️ Most issues are auto-resolved by the system'}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
