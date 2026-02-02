import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { translations } from '@/lib/translations';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { AlertCard } from '@/components/AlertCard';

export function AlertsPage() {
  const { language, alerts, acknowledgeAlert } = useApp();

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);
  const acknowledgedAlerts = alerts.filter(a => a.acknowledged);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="page-container px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="section-title">{translations.alerts.title[language]}</h2>

          {unacknowledgedAlerts.length === 0 && acknowledgedAlerts.length === 0 ? (
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
            <>
              {unacknowledgedAlerts.length > 0 && (
                <div className="mb-6">
                  <p className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                    <Bell size={16} className="text-destructive" />
                    {language === 'bn' ? 'নতুন সতর্কতা' : 'New Alerts'} ({unacknowledgedAlerts.length})
                  </p>
                  <div className="space-y-3">
                    <AnimatePresence>
                      {unacknowledgedAlerts.map((alert) => (
                        <AlertCard
                          key={alert.id}
                          alert={alert}
                          onAcknowledge={acknowledgeAlert}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {acknowledgedAlerts.length > 0 && (
                <div>
                  <p className="mb-3 text-sm font-medium text-muted-foreground">
                    {language === 'bn' ? 'পুরাতন সতর্কতা' : 'Past Alerts'}
                  </p>
                  <div className="space-y-3 opacity-60">
                    {acknowledgedAlerts.slice(0, 10).map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onAcknowledge={acknowledgeAlert}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
