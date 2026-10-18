import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserPlus, Search, LogOut } from 'lucide-react';
import { useCandidates, useLogout } from '../../lib/api';

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewCandidate: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  onNewCandidate,
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const logoutMutation = useLogout();

  // Fetch candidates matching search
  const { data: candidatesData } = useCandidates({
    q: search || undefined,
    page_size: 5,
  });

  // Global keydown listeners for shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      // Cmd+K or Ctrl+K opens palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
        return;
      }

      if (isInput || open) return;

      // '/' to focus search or open palette
      if (e.key === '/') {
        e.preventDefault();
        onOpenChange(true);
      }

      // 'c' to create candidate
      if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onNewCandidate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange, onNewCandidate]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
      {/* Backdrop click */}
      <div className="fixed inset-0 -z-10" onClick={() => onOpenChange(false)} />

      <div className="w-full max-w-xl bg-[#111827] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <Command
          label="Command Palette"
          className="w-full"
          shouldFilter={false}
        >
          <div className="flex items-center px-4 border-b border-white/[0.08] bg-[#111827]">
            <Search className="h-4 w-4 text-slate-400 mr-2.5 shrink-0 stroke-[1.8]" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search candidates..."
              className="w-full h-12 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none border-none"
              autoFocus
            />
            <kbd className="text-[11px] font-mono px-2 py-0.5 bg-slate-800 text-slate-400 rounded-md border border-white/[0.1] shadow-inner">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2.5 divide-y divide-white/[0.06]">
            <Command.Empty className="py-8 text-center text-xs text-slate-500">
              No matching commands or candidates found.
            </Command.Empty>

            {/* Navigation group */}
            <Command.Group heading="Navigation" className="text-[11px] font-bold text-slate-500 px-2 py-1.5 uppercase tracking-wider">
              <Command.Item
                onSelect={() => {
                  navigate('/dashboard');
                  onOpenChange(false);
                }}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white cursor-pointer aria-selected:bg-emerald-950/60 aria-selected:text-emerald-300 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="h-4 w-4 text-slate-400 stroke-[1.8]" />
                  <span>Go to Dashboard</span>
                </div>
                <kbd className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-white/[0.08]">
                  g d
                </kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  navigate('/candidates');
                  onOpenChange(false);
                }}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white cursor-pointer aria-selected:bg-emerald-950/60 aria-selected:text-emerald-300 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-slate-400 stroke-[1.8]" />
                  <span>Go to Candidates</span>
                </div>
                <kbd className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-white/[0.08]">
                  g c
                </kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onOpenChange(false);
                  onNewCandidate();
                }}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white cursor-pointer aria-selected:bg-emerald-950/60 aria-selected:text-emerald-300 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <UserPlus className="h-4 w-4 text-emerald-400 stroke-[1.8]" />
                  <span className="font-semibold text-emerald-400">Add New Candidate</span>
                </div>
                <kbd className="text-[11px] font-mono text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  c
                </kbd>
              </Command.Item>
            </Command.Group>

            {/* Candidates Search Results */}
            {candidatesData && candidatesData.items.length > 0 && (
              <Command.Group heading="Candidates" className="text-[11px] font-bold text-slate-500 px-2 py-1.5 uppercase tracking-wider pt-2">
                {candidatesData.items.map((candidate) => (
                  <Command.Item
                    key={candidate.id}
                    onSelect={() => {
                      navigate(`/candidates?selected=${candidate.id}`);
                      onOpenChange(false);
                    }}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-slate-300 hover:bg-slate-800/60 hover:text-white cursor-pointer aria-selected:bg-emerald-950/60 aria-selected:text-emerald-300 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-white">{candidate.full_name}</div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {candidate.applied_role} &middot; {candidate.email}
                      </div>
                    </div>
                    <span className="text-[11px] capitalize font-semibold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                      {candidate.current_stage}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Account Actions */}
            <Command.Group heading="Account" className="text-[11px] font-bold text-slate-500 px-2 py-1.5 uppercase tracking-wider pt-2">
              <Command.Item
                onSelect={() => {
                  onOpenChange(false);
                  logoutMutation.mutate();
                }}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/40 cursor-pointer aria-selected:bg-rose-950/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <LogOut className="h-4 w-4 stroke-[1.8]" />
                  <span>Log out of ATS</span>
                </div>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
};
