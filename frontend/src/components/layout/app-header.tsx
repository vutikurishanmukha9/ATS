import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Search, Plus, LogOut, RefreshCw, Layers, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { useCurrentUser, useLogout } from '../../lib/api';
import { subscribeColdStart } from '../../lib/api-client';

export interface AppHeaderProps {
  onOpenCommandPalette: () => void;
  onOpenCreateCandidate: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenCommandPalette,
  onOpenCreateCandidate,
}) => {
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();
  const [coldStartActive, setColdStartActive] = useState(false);

  useEffect(() => {
    return subscribeColdStart((isStarting) => {
      setColdStartActive(isStarting);
    });
  }, []);

  const userInitial = user?.full_name
    ? user.full_name.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : 'R';

  return (
    <>
      {coldStartActive && (
        <aside
          role="status"
          aria-label="Server status notice"
          className="bg-amber-950/60 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-200 flex items-center justify-center gap-2 select-none"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" aria-hidden="true" />
          <span className="font-medium">Backend service initializing. Please standby...</span>
        </aside>
      )}

      <header className="h-14 bg-[#0B0F17]/95 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 lg:px-8 sticky top-0 z-30 select-none">
        <div className="max-w-[1536px] mx-auto h-full flex items-center justify-between gap-4">
          {/* Left: Brand & Navigation */}
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            {/* Brand Logo & Name */}
            <NavLink to="/dashboard" className="flex items-center gap-2.5 shrink-0 hover:opacity-90 transition-opacity">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-sm shadow-emerald-500/25">
                <Layers className="w-4 h-4 stroke-[2.2]" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-sm tracking-tight text-white leading-none">
                  Crack it
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-semibold tracking-wide">
                  Enterprise
                </span>
              </div>
            </NavLink>

            {/* Navigation links */}
            <nav className="flex items-center gap-1 shrink-0" aria-label="Main navigation">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold border border-white/[0.1]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/candidates"
                className={({ isActive }) =>
                  `px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold border border-white/[0.1]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                  }`
                }
              >
                Candidates
              </NavLink>
              <NavLink
                to="/jobs"
                className={({ isActive }) =>
                  `px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold border border-white/[0.1]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                  }`
                }
              >
                Requisitions
              </NavLink>
              <NavLink
                to="/careers"
                target="_blank"
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/30 transition-all flex items-center gap-1 shrink-0"
                title="Open public Careers Hub in new tab"
              >
                <span>Careers</span>
                <ExternalLink className="w-3 h-3 text-emerald-400/80" aria-hidden="true" />
              </NavLink>
            </nav>
          </div>

          {/* Right: Search, Actions, Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Command Palette Trigger */}
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs text-slate-400 bg-slate-900/90 hover:bg-slate-800 hover:text-slate-200 border border-white/[0.08] hover:border-white/[0.15] rounded-lg transition-all shadow-inner"
              title="Search candidates & commands (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span className="hidden xl:inline font-normal text-slate-400">Search talent...</span>
              <kbd className="inline-flex px-1.5 py-0.5 text-[10px] bg-slate-800/90 border border-white/[0.1] text-slate-400 font-mono rounded">
                ⌘K
              </kbd>
            </button>

            {/* Quick Add Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenCreateCandidate}
              title="Add candidate (shortcut: c)"
              className="px-2.5 sm:px-3 shadow-sm shadow-emerald-950/40 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.2] shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Add Candidate</span>
              <kbd className="ml-1 px-1.5 py-0.2 text-[10px] bg-white/20 border border-white/30 text-white font-mono rounded hidden lg:inline-flex items-center justify-center leading-none">
                c
              </kbd>
            </Button>

            {/* User & Sign Out */}
            <div className="h-5 w-px bg-white/[0.08] mx-0.5 hidden sm:block shrink-0" />

            {user && (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div
                  className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center justify-center shrink-0 select-none shadow-inner"
                  title={user.email}
                >
                  {userInitial}
                </div>
                <span className="text-xs text-slate-300 font-medium truncate max-w-[140px] hidden 2xl:inline" title={user.email}>
                  {user.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                  className="text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 p-1.5 h-8 w-8 shrink-0"
                  title="Sign out of recruiting console"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
