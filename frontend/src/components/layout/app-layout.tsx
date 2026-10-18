import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from './app-header';

export interface AppLayoutProps {
  onOpenCommandPalette: () => void;
  onOpenCreateCandidate: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  onOpenCommandPalette,
  onOpenCreateCandidate,
}) => {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans antialiased selection:bg-emerald-900 selection:text-emerald-100 transition-colors duration-200 w-full max-w-full overflow-x-hidden">
      <AppHeader
        onOpenCommandPalette={onOpenCommandPalette}
        onOpenCreateCandidate={onOpenCreateCandidate}
      />
      <main className="flex-1 w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};
