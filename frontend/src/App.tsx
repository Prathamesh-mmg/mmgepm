// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

// Lazy-loaded pages for code splitting
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const ProjectsPage        = lazy(() => import('./pages/ProjectsPage'));
const ProjectDetailPage   = lazy(() => import('./pages/ProjectDetailPage'));
const TasksPage           = lazy(() => import('./pages/TasksPage'));
const TaskDetailPage      = lazy(() => import('./pages/TaskDetailPage'));
const DocumentsPage       = lazy(() => import('./pages/DocumentsPage'));
const ProcurementPage     = lazy(() => import('./pages/ProcurementPage'));
const InventoryPage       = lazy(() => import('./pages/InventoryPage'));
const ResourcesPage       = lazy(() => import('./pages/ResourcesPage'));
const BudgetPage          = lazy(() => import('./pages/BudgetPage'));
const RisksPage           = lazy(() => import('./pages/RisksPage'));
const UsersPage           = lazy(() => import('./pages/admin/UsersPage'));
const SettingsPage        = lazy(() => import('./pages/admin/SettingsPage'));
const ProfilePage         = lazy(() => import('./pages/ProfilePage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:        60_000,
      retry:            1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore(s => s.isAuth);
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const isAdmin = useAuthStore(s => s.isAdmin);
  return isAdmin() ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

const PageFallback = () => (
  <div className="flex items-center justify-center py-32">
    <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
  </div>
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: '0.75rem',
              background: 'var(--bg-primary)',
              color:       'var(--text-primary)',
              border:      '1px solid var(--border)',
              fontSize:    '14px',
            },
            success: { iconTheme: { primary: '#FFD700', secondary: '#1A1A1A' } },
          }}
        />

        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected */}
          <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            <Route path="projects">
              <Route index element={
                <Suspense fallback={<PageFallback />}><ProjectsPage /></Suspense>
              } />
              <Route path=":id/*" element={
                <Suspense fallback={<PageFallback />}><ProjectDetailPage /></Suspense>
              } />
            </Route>

            <Route path="tasks">
              <Route index element={
                <Suspense fallback={<PageFallback />}><TasksPage /></Suspense>
              } />
              <Route path=":id" element={
                <Suspense fallback={<PageFallback />}><TaskDetailPage /></Suspense>
              } />
            </Route>

            <Route path="documents/*" element={
              <Suspense fallback={<PageFallback />}><DocumentsPage /></Suspense>
            } />

            <Route path="procurement/*" element={
              <Suspense fallback={<PageFallback />}><ProcurementPage /></Suspense>
            } />

            <Route path="inventory/*" element={
              <Suspense fallback={<PageFallback />}><InventoryPage /></Suspense>
            } />

            <Route path="resources/*" element={
              <Suspense fallback={<PageFallback />}><ResourcesPage /></Suspense>
            } />

            <Route path="budget/*" element={
              <Suspense fallback={<PageFallback />}><BudgetPage /></Suspense>
            } />

            <Route path="risks/*" element={
              <Suspense fallback={<PageFallback />}><RisksPage /></Suspense>
            } />

            <Route path="profile" element={
              <Suspense fallback={<PageFallback />}><ProfilePage /></Suspense>
            } />

            {/* Admin */}
            <Route path="admin" element={<RequireAdmin><Suspense fallback={<PageFallback />}><UsersPage /></Suspense></RequireAdmin>}>
              <Route path="users"    element={<Suspense fallback={<PageFallback />}><UsersPage /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<PageFallback />}><SettingsPage /></Suspense>} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
