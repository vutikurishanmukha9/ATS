import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCurrentUser, type CandidateRead } from './lib/api';
import { AppLayout } from './components/layout/app-layout';
import { LoginPage } from './pages/login-page';
import { DashboardPage } from './pages/dashboard-page';
import { CandidatesPage } from './pages/candidates-page';
import { CareersPage } from './pages/careers-page';
import { JobsPage } from './pages/jobs-page';
import { CommandPalette } from './components/command-palette/command-palette';
import { CandidateFormModal } from './components/candidate-form/candidate-form-modal';
import { CandidateDetailPanel } from './components/candidate-detail/candidate-detail-panel';
import { Button } from './components/ui/button';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { data: user, isLoading, isError } = useCurrentUser();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="font-mono text-xs text-muted">Checking authentication...</div>
      </div>
    );
  }

  if (isError || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="font-mono text-xs text-muted">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function ATSApp() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [createCandidateOpen, setCreateCandidateOpen] = useState(false);
  const [candidateToEdit, setCandidateToEdit] = useState<CandidateRead | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const handleOpenEditCandidate = (candidate: CandidateRead) => {
    setCandidateToEdit(candidate);
    setCreateCandidateOpen(true);
  };

  const handleCloseFormModal = (open: boolean) => {
    setCreateCandidateOpen(open);
    if (!open) {
      setCandidateToEdit(null);
    }
  };

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            <AuthRoute>
              <LoginPage />
            </AuthRoute>
          }
        />

        {/* Public Student & Career Portal */}
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/student" element={<CareersPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout
                onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                onOpenCreateCandidate={() => {
                  setCandidateToEdit(null);
                  setCreateCandidateOpen(true);
                }}
              />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <DashboardPage
                onSelectCandidate={(id) => setSelectedCandidateId(id)}
                onOpenCreateCandidate={() => {
                  setCandidateToEdit(null);
                  setCreateCandidateOpen(true);
                }}
              />
            }
          />
          <Route
            path="/candidates"
            element={
              <CandidatesPage
                onSelectCandidate={(id) => setSelectedCandidateId(id)}
                onEditCandidate={handleOpenEditCandidate}
                onOpenCreateCandidate={() => {
                  setCandidateToEdit(null);
                  setCreateCandidateOpen(true);
                }}
              />
            }
          />
          <Route path="/jobs" element={<JobsPage />} />
        </Route>

        <Route
          path="*"
          element={
            <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4 text-center space-y-3">
              <span className="font-mono text-2xl font-semibold text-ink">404</span>
              <p className="text-xs text-muted">The requested page does not exist.</p>
              <Button size="sm" onClick={() => (window.location.href = '/dashboard')}>
                Return to Dashboard
              </Button>
            </div>
          }
        />
      </Routes>

      {/* Global Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNewCandidate={() => {
          setCandidateToEdit(null);
          setCreateCandidateOpen(true);
        }}
      />

      {/* Candidate Create / Edit Modal */}
      <CandidateFormModal
        open={createCandidateOpen}
        onOpenChange={handleCloseFormModal}
        candidateToEdit={candidateToEdit}
        onSelectExistingCandidate={(id) => {
          setCreateCandidateOpen(false);
          setSelectedCandidateId(id);
        }}
      />

      {/* Candidate Detail Slide-Over Panel */}
      <CandidateDetailPanel
        candidateId={selectedCandidateId}
        onClose={() => setSelectedCandidateId(null)}
        onEdit={() => {
          // If we need to edit from detail panel, candidate data is loaded in detail panel
          // This will be handled if needed
        }}
      />

      {/* Global Notifications */}
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          className: 'font-sans text-xs border border-white/10 bg-[#151F32] text-slate-100 shadow-2xl rounded-lg',
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ATSApp />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
