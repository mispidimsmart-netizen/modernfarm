import { lazy, Suspense, memo, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ShedProvider } from "./hooks/useSheds";
import { FarmProvider } from "./context/FarmContext";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { OfflineMutationBadge } from "./components/OfflineMutationBadge";
import { PWAUpdateBanner } from "./components/pwa/PWAUpdateBanner";
import { InstallPromptCard } from "./components/pwa/InstallPromptCard";
import { RoleProtectedRoute, PlatformRoleGuard } from "./components/auth";
import { useBatchEditQueue } from "./hooks/useBatchEditQueue";
import { useFarmDataRealtime } from "./hooks/useFarmDataRealtime";
import { useDeviceOnlineToasts } from "./hooks/useDeviceOnlineToasts";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { SentryUserSync } from "./components/SentryUserSync";

// Retry wrapper for lazy imports (handles stale cache / failed fetches)
function lazyRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 2
): React.LazyExoticComponent<T> {
  const load = (remaining: number): Promise<{ default: T }> =>
    factory().catch((err) => {
      if (remaining > 0) {
        return new Promise<{ default: T }>((resolve) => {
          setTimeout(() => resolve(load(remaining - 1)), 500);
        });
      }
      // Final fallback: reload page to get fresh assets
      window.location.reload();
      throw err;
    });
  return lazy(() => load(retries));
}


// Lazy load pages for better initial load performance
const LoginPage = lazyRetry(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const Dashboard = lazyRetry(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const ControlPage = lazyRetry(() => import("./pages/ControlPage").then(m => ({ default: m.ControlPage })));
const AutomationPage = lazyRetry(() => import("./pages/AutomationPage").then(m => ({ default: m.AutomationPage })));
const AlertsPage = lazyRetry(() => import("./pages/AlertsPage").then(m => ({ default: m.AlertsPage })));
// ReportsPage removed — content embedded in Settings → Reports tab
const SettingsPage = lazyRetry(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const ApiDocsPage = lazyRetry(() => import("./pages/ApiDocsPage").then(m => ({ default: m.ApiDocsPage })));
const FarmManagementPage = lazyRetry(() => import("./pages/FarmManagementPage").then(m => ({ default: m.FarmManagementPage })));
const InstallationGuidePage = lazyRetry(() => import("./pages/InstallationGuidePage"));
const DeviceSetupWizardPage = lazyRetry(() => import("./pages/DeviceSetupWizardPage"));
const AuditLogPage = lazyRetry(() => import("./pages/AuditLogPage"));
const AdminPage = lazyRetry(() => import("./pages/AdminPage"));
const AdminUserSubTabPage = lazyRetry(() => import("./pages/AdminUserSubTabPage"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const FarmSetupWizardPage = lazyRetry(() => import("./pages/FarmSetupWizardPage"));
const ResetPasswordPage = lazyRetry(() => import("./pages/ResetPasswordPage"));
const FinanceReportPage = lazyRetry(() => import("./pages/FinanceReportPage"));
const TrainingVideosPage = lazyRetry(() => import("./pages/TrainingVideosPage"));
const CommunityPage = lazyRetry(() => import("./pages/CommunityPage"));
const Phase9ReportPage = lazyRetry(() => import("./pages/Phase9ReportPage"));
const BenchmarkPage = lazyRetry(() => import("./pages/BenchmarkPage"));
const StatusPage = lazyRetry(() => import("./pages/StatusPage"));
const SecurityReportPage = lazyRetry(() => import("./pages/SecurityReportPage"));
const OrgAdminPage = lazyRetry(() => import("./pages/OrgAdminPage"));
const OrgSignupPage = lazyRetry(() => import("./pages/OrgSignupPage"));
const WorkerPage = lazyRetry(() => import("./pages/WorkerPage"));
const MembersPage = lazyRetry(() => import("./pages/MembersPage"));
const SentryTestPage = lazyRetry(() => import("./pages/SentryTestPage"));
const PinMapPage = lazyRetry(() => import("./pages/PinMapPage"));
const OAuthConsentPage = lazyRetry(() => import("./pages/OAuthConsentPage"));
import { GlobalActionFAB } from "./components/GlobalActionFAB";
import { OperationsHealthStrip } from "./components/dashboard/OperationsHealthStrip";
import { CriticalAlertBanner } from "./components/dashboard/CriticalAlertBanner";
import { SmartActionDock } from "./components/dashboard/SmartActionDock";


// Optimized QueryClient with better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes — fewer refetches, snappier nav
      gcTime: 1000 * 60 * 30, // 30 minutes — keep cache warm across pages
      // Never trigger a hard reload on focus — too noisy on mobile.
      refetchOnWindowFocus: false,
      // On reconnect: silently refresh in the background. Cached data stays
      // visible (no Skeleton flash) because we serve cache first via
      // networkMode 'offlineFirst' and components keep previous data.
      refetchOnReconnect: 'always',
      refetchOnMount: false,
      networkMode: 'offlineFirst',
      retry: 1,
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 1,
    },
  },
});

// Persist React Query cache to localStorage so dashboards open instantly when
// offline (or on flaky networks). Cache survives reloads up to 24h.
const queryPersister = typeof window !== 'undefined'
  ? createSyncStoragePersister({
      storage: window.localStorage,
      key: 'farmeye-query-cache-v1',
      throttleTime: 1000,
    })
  : undefined;


// Loading spinner component - memoized
const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">লোড হচ্ছে...</p>
      </div>
    </div>
  );
});

// Page loading skeleton - lighter than full spinner
const PageSkeleton = memo(function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="animate-pulse space-y-4">
        <div className="h-14 bg-muted rounded-lg" />
        <div className="h-32 bg-muted rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-28 bg-muted rounded-xl" />
          <div className="h-28 bg-muted rounded-xl" />
        </div>
      </div>
    </div>
  );
});

// Protected route wrapper - memoized
const ProtectedRoute = memo(function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
});

// Mounts globally so queued batch edits sync as soon as the user returns online,
// regardless of whether the edit dialog is currently open.
function GlobalBatchEditQueue() {
  useBatchEditQueue();
  useFarmDataRealtime();
  useDeviceOnlineToasts();
  return null;
}

// Hide global chrome (BottomNav, FAB, OperationsHealthStrip, etc.) on kiosk routes.
const KIOSK_ROUTES = ['/worker'];
function KioskGate({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  if (KIOSK_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) return null;
  return <>{children}</>;
}

// App routes component
function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" replace /> : <LoginPage />} 
        />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        {/* Public transparency pages — no auth required */}
        <Route path="/status" element={<StatusPage />} />
        <Route path="/security" element={<SecurityReportPage />} />
        {/* Sentry verification — public, no auth required for testing */}
        <Route path="/sentry-test" element={<SentryTestPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        {/* Worker Mode (S2.1) — kiosk route, PIN-locked, no global chrome */}
        <Route
          path="/worker"
          element={
            <ProtectedRoute>
              <WorkerPage />
            </ProtectedRoute>
          }
        />
        {/* Control Page - Requires at least viewer role (shown with restrictions) */}
        <Route
          path="/control"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute requiredRole="viewer">
                <ControlPage />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        {/* /lighting merged into Dashboard + Settings → Lighting tab */}
        <Route path="/lighting" element={<Navigate to="/settings" replace />} />
        <Route
          path="/automation"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute requiredCapability="canLogDailyData">
                <AutomationPage />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/setup"
          element={
            <ProtectedRoute>
              <FarmSetupWizardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alerts"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute requiredCapability="canLogDailyData">
                <AlertsPage />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        {/* /reports route removed — analytics moved into Settings → Reports tab */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/members"
          element={
            <ProtectedRoute>
              <MembersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/api-docs"
          element={
            <ProtectedRoute>
              <ApiDocsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/farm"
          element={
            <ProtectedRoute>
              <FarmManagementPage />
            </ProtectedRoute>
          }
        />
        {/* Platform Admin Panel — Nexiot Labs super admin ONLY */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <PlatformRoleGuard require="super_admin">
                <AdminPage />
              </PlatformRoleGuard>
            </ProtectedRoute>
          }
        />
        {/* Per-sub-tab deep-link routes with their own role guards */}
        <Route
          path="/admin/users/:subtab"
          element={
            <ProtectedRoute>
              <AdminUserSubTabPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform-admin"
          element={
            <ProtectedRoute>
              <PlatformRoleGuard require="super_admin">
                <AdminPage />
              </PlatformRoleGuard>
            </ProtectedRoute>
          }
        />
        {/* Org Admin Dashboard — org owner/admin (or super admin) */}
        <Route
          path="/org-admin"
          element={
            <ProtectedRoute>
              <PlatformRoleGuard require="org_admin">
                <OrgAdminPage />
              </PlatformRoleGuard>
            </ProtectedRoute>
          }
        />

        {/* Public org self-signup (auth required, no org needed) */}
        <Route
          path="/org-signup"
          element={
            <ProtectedRoute>
              <OrgSignupPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/installation-guide"
          element={
            <ProtectedRoute>
              <InstallationGuidePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/device-setup"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute requiredCapability="canChangeHardware">
                <DeviceSetupWizardPage />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-log"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute requiredCapability="canLogDailyData">
                <AuditLogPage />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance-report"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute requiredCapability="canViewFinance">
                <FinanceReportPage />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route path="/training" element={<ProtectedRoute><TrainingVideosPage /></ProtectedRoute>} />
        <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
        <Route path="/phase9-report" element={<ProtectedRoute><RoleProtectedRoute requiredRole="admin"><Phase9ReportPage /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/benchmark" element={<ProtectedRoute><BenchmarkPage /></ProtectedRoute>} />
        <Route path="/pin-map" element={<ProtectedRoute><PinMapPage /></ProtectedRoute>} />
        {/* OAuth 2.1 consent page for MCP / external app authorization */}
        <Route path="/.lovable/oauth/consent" element={<OAuthConsentPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

// App routes wrapper - memoized
const AppWithRoutes = memo(function AppWithRoutes() {
  return <AppRoutes />;
});

const App = () => {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('[App] Unhandled rejection:', event.reason);
      event.preventDefault();
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister!,
        maxAge: 1000 * 60 * 60 * 24, // 24h
        buster: 'v1',
        dehydrateOptions: {
          // Don't persist mutations or queries that are still pending/erroring
          shouldDehydrateQuery: (q) => q.state.status === 'success',
        },
      }}
    >
      <TooltipProvider>
        <AppErrorBoundary>
        <AuthProvider>
          <SentryUserSync />
          <FarmProvider>
            <ShedProvider>
              <Toaster />
              <Sonner />
              <OfflineIndicator />
              <div className="fixed right-3 top-3 z-[60]">
                <OfflineMutationBadge />
              </div>
              <PWAUpdateBanner />
              <InstallPromptCard />
              <GlobalBatchEditQueue />
              <BrowserRouter>
                <a
                  href="#main-content"
                  className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-2 focus:rounded-md"
                >
                  মূল কন্টেন্টে যান
                </a>
                <main id="main-content">
                  <KioskGate>
                    <OperationsHealthStrip />
                    <CriticalAlertBanner />
                  </KioskGate>
                  <AppWithRoutes />
                </main>
                <KioskGate>
                  <SmartActionDock />
                  <GlobalActionFAB />
                </KioskGate>
              </BrowserRouter>
            </ShedProvider>
          </FarmProvider>
        </AuthProvider>
        </AppErrorBoundary>
      </TooltipProvider>
    </PersistQueryClientProvider>
  );
};

export default App;
