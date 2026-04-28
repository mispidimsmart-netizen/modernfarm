import { lazy, Suspense, memo, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ShedProvider } from "./hooks/useSheds";
import { FarmProvider } from "./context/FarmContext";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { PWAUpdateBanner } from "./components/pwa/PWAUpdateBanner";
import { RoleProtectedRoute } from "./components/auth";

// Retry wrapper for lazy imports (handles stale cache / failed fetches)
function lazyRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 2
): React.LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((err) => {
      if (retries > 0) {
        // Clear caches and retry
        return new Promise<{ default: T }>((resolve) => {
          setTimeout(() => resolve(lazyRetry(factory, retries - 1) as any), 500);
        });
      }
      // Final fallback: reload page to get fresh assets
      window.location.reload();
      return factory(); // won't resolve but satisfies TS
    })
  );
}

// Lazy load pages for better initial load performance
const LoginPage = lazyRetry(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const Dashboard = lazyRetry(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const ControlPage = lazyRetry(() => import("./pages/ControlPage").then(m => ({ default: m.ControlPage })));
const AutomationPage = lazyRetry(() => import("./pages/AutomationPage").then(m => ({ default: m.AutomationPage })));
const AlertsPage = lazyRetry(() => import("./pages/AlertsPage").then(m => ({ default: m.AlertsPage })));
const ReportsPage = lazyRetry(() => import("./pages/ReportsPage").then(m => ({ default: m.ReportsPage })));
const SettingsPage = lazyRetry(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const ApiDocsPage = lazyRetry(() => import("./pages/ApiDocsPage").then(m => ({ default: m.ApiDocsPage })));
const FarmManagementPage = lazyRetry(() => import("./pages/FarmManagementPage").then(m => ({ default: m.FarmManagementPage })));
const InstallationGuidePage = lazyRetry(() => import("./pages/InstallationGuidePage"));
const AuditLogPage = lazyRetry(() => import("./pages/AuditLogPage"));
const AdminPage = lazyRetry(() => import("./pages/AdminPage"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const FarmSetupWizardPage = lazyRetry(() => import("./pages/FarmSetupWizardPage"));
const ResetPasswordPage = lazyRetry(() => import("./pages/ResetPasswordPage"));


// Optimized QueryClient with better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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
  // Lazy import via require-style to avoid top-of-file churn
  const { useBatchEditQueue } = require('@/hooks/useBatchEditQueue');
  useBatchEditQueue();
  return null;
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
        <Route 
          path="/reset-password" 
          element={<ResetPasswordPage />} 
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
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
              <AutomationPage />
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
              <AlertsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
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
        {/* Admin Page - Requires admin role */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute requiredRole="admin">
                <AdminPage />
              </RoleProtectedRoute>
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
          path="/audit-log"
          element={
            <ProtectedRoute>
              <AuditLogPage />
            </ProtectedRoute>
          }
        />
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <FarmProvider>
            <ShedProvider>
              <Toaster />
              <Sonner />
              <OfflineIndicator />
              <PWAUpdateBanner />
              <BrowserRouter>
                <AppWithRoutes />
              </BrowserRouter>
            </ShedProvider>
          </FarmProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
