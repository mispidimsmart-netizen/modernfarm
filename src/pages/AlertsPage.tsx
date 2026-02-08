import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, History, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAcknowledgeAlert } from '@/hooks/useFarmData';
import { useSmartAlerts } from '@/hooks/useSmartAlerts';
import { translations } from '@/lib/translations';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { SmartAlertCard, AlertTimeline } from '@/components/alerts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AlertsPage() {
  const { language } = useAuth();
  const { activeAlerts, resolvedAlerts, alertCounts, isQuietHours } = useSmartAlerts();
  const acknowledgeAlert = useAcknowledgeAlert();

  const handleAcknowledge = (id: string) => {
    acknowledgeAlert.mutate(id);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="page-container px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header with counts */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">{translations.alerts.title[language]}</h2>
            
            {alertCounts.total > 0 && (
              <div className="flex items-center gap-2">
                {alertCounts.danger > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
                    <AlertTriangle size={12} />
                    {alertCounts.danger}
                  </span>
                )}
                {alertCounts.warning > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                    <AlertCircle size={12} />
                    {alertCounts.warning}
                  </span>
                )}
                {alertCounts.info > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    <Info size={12} />
                    {alertCounts.info}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quiet hours indicator */}
          {isQuietHours && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <Bell size={16} />
              <span>
                {language === 'bn' 
                  ? 'রাতের শান্ত মোড চালু - শুধু জরুরি সতর্কতায় শব্দ হবে' 
                  : 'Quiet hours active - only urgent alerts will sound'}
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
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle size={40} className="text-primary" />
                  </div>
                  <p className="text-lg font-medium text-foreground">
                    {translations.alerts.noAlerts[language]}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {language === 'bn' 
                      ? 'সবকিছু ঠিক আছে!' 
                      : 'Everything is running smoothly!'}
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {activeAlerts.map((alert) => (
                      <SmartAlertCard
                        key={alert.id}
                        alert={alert}
                        onAcknowledge={handleAcknowledge}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history">
              <AlertTimeline alerts={resolvedAlerts} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
