import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Search, Plus, LogOut, RefreshCw, Briefcase, ExternalLink } from 'lucide-react';
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
    : 'U';

  return (
    <>
      {coldStartActive && (
        <aside
          role="status"
          aria-label="Server status notice"
          className="bg-amber-950/40 border-b border-amber-500/20 px-4 py-1.5 text-xs text-amber-200 flex items-center justify-center gap-2 select-none"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" aria-hidden="true" />
          <span className="font-medium">Connecting to server instance. Please standby...</span>
        </aside>
      )}

      <header className="h-14 bg-[#090D16] border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 sticky top-0 z-30 select-none">
        <div className="max-w-[1536px] mx-auto h-full flex items-center justify-between gap-4">
          {/* Left: Brand & Main Navigation */}
          <div className="flex items-center gap-6 shrink-0">
            {/* Brand Logo & Name */}
            <NavLink
              to="/dashboard"
              className="flex items-center gap-2.5 shrink-0 group focus:outline-none"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/50 group-hover:text-emerald-300 transition-colors">
                <Briefcase className="w-3.5 h-3.5 stroke-[2]" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-tight text-slate-100 group-hover:text-white transition-colors">
                  Crack it
                </span>
                <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">
                  ATS
                </span>
              </div>
            </NavLink>

            {/* Navigation links */}
            <nav className="flex items-center gap-1 shrink-0" aria-label="Main navigation">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-slate-800/90 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/candidates"
                className={({ isActive }) =>
                  `px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-slate-800/90 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`
                }
              >
                Candidates
              </NavLink>
              <NavLink
                to="/jobs"
                className={({ isActive }) =>
                  `px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-slate-800/90 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`
                }
              >
                Requisitions
              </NavLink>
              <NavLink
                to="/careers"
                target="_blank"
                className="px-2.5 py-1.5 text-xs font-medium rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors flex items-center gap-1 shrink-0"
                title="View public careers portal in new tab"
              >
                <span>Careers Portal</span>
                <ExternalLink className="w-3 h-3 text-slate-500" aria-hidden="true" />
              </NavLink>
            </nav>
          </div>

          {/* Right: Search, Quick Add, User Profile */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Command Palette Trigger */}
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs text-slate-400 bg-slate-900 hover:bg-slate-800/80 hover:text-slate-200 border border-slate-800 rounded-md transition-colors"
              title="Search candidates and commands (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span className="hidden xl:inline font-normal text-slate-400">Search candidates...</span>
              <kbd className="inline-flex px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700/60 text-slate-400 font-mono rounded">
                ⌘K
              </kbd>
            </button>

            {/* Quick Add Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenCreateCandidate}
              title="Add new candidate profile (shortcut: c)"
              className="px-3 shrink-0 font-medium"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2] mr-1" aria-hidden="true" />
              <span>Add Candidate</span>
            </Button>

            {/* Separator */}
            <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block shrink-0" />

            {/* User Profile & Sign Out */}
            {user && (
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-medium text-xs flex items-center justify-center shrink-0 select-none"
                  title={user.email}
                >
                  {userInitial}
                </div>
                <div className="hidden 2xl:flex flex-col text-left leading-tight">
                  <span className="text-xs font-medium text-slate-200 truncate max-w-[130px]">
                    {user.full_name || 'Recruiter'}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate max-w-[130px]">
                    {user.email}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                  className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-1.5 h-8 w-8 shrink-0"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
