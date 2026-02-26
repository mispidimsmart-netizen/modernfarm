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

// Lazy load pages for better initial load performance
const LoginPage = lazy(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const ControlPage = lazy(() => import("./pages/ControlPage").then(m => ({ default: m.ControlPage })));
const LightingPage = lazy(() => import("./pages/LightingPage").then(m => ({ default: m.LightingPage })));
const AutomationPage = lazy(() => import("./pages/AutomationPage").then(m => ({ default: m.AutomationPage })));
const AlertsPage = lazy(() => import("./pages/AlertsPage").then(m => ({ default: m.AlertsPage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage").then(m => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const ApiDocsPage = lazy(() => import("./pages/ApiDocsPage").then(m => ({ default: m.ApiDocsPage })));
const FarmManagementPage = lazy(() => import("./pages/FarmManagementPage").then(m => ({ default: m.FarmManagementPage })));
const InstallationGuidePage = lazy(() => import("./pages/InstallationGuidePage"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const FarmSetupWizardPage = lazy(() => import("./pages/FarmSetupWizardPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));


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
        <Route
          path="/lighting"
          element={
            <ProtectedRoute>
              <LightingPage />
            </ProtectedRoute>
          }
        />
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
