import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Search,
  ExternalLink,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Breadcrumbs } from '../components/ui/breadcrumbs';
import { StatusIndicator } from '../components/ui/status-indicator';
import { useJobs, useCreateJob, useCandidates } from '../lib/api';
import { toast } from '../lib/toast';

export const JobsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: jobs = [], isLoading: jobsLoading } = useJobs();
  const { data: candidatesData } = useCandidates({ page_size: 100 });
  const candidates = candidatesData?.items || [];
  const createJobMutation = useCreateJob();

  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDept, setNewDept] = useState('Engineering');
  const [newLocation, setNewLocation] = useState('Remote');
  const [newType, setNewType] = useState('Full-time');
  const [newExp, setNewExp] = useState('3+ years');
  const [newDesc, setNewDesc] = useState('');
  const [newSkills, setNewSkills] = useState('');
  const [newThreshold, setNewThreshold] = useState(65);

  const getCandidateCountForRole = (roleTitle: string) => {
    return candidates.filter(
      (c) => c.applied_role.toLowerCase() === roleTitle.toLowerCase()
    ).length;
  };

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Position title is required');
      return;
    }

    const skillsArray = newSkills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await createJobMutation.mutateAsync({
        title: newTitle,
        department: newDept,
        location: newLocation,
        employment_type: newType,
        experience_level: newExp,
        description: newDesc,
        required_skills: skillsArray,
        threshold: newThreshold,
      });

      toast.success(`Job requisition "${newTitle}" published successfully!`);
      setCreateModalOpen(false);
      // Reset form
      setNewTitle('');
      setNewDesc('');
      setNewSkills('');
      setNewThreshold(65);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create job requisition');
    }
  };

  const filteredJobs = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.department.toLowerCase().includes(search.toLowerCase()) ||
      j.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <Breadcrumbs
            items={[
              { label: 'ATS Console', onClick: () => navigate('/dashboard') },
              { label: 'Requisitions' },
            ]}
            className="mb-1.5"
          />
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              Job Requisitions & Openings
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Enterprise Pipeline
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
            Active organizational openings, automated screening thresholds, and candidate pipeline volume.
          </p>
        </div>

        {/* Executive Telemetry Hub (Bridges the Empty Horizontal Void) */}
        <div className="hidden lg:flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-white/[0.08] shadow-inner">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Screening Engine</span>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">ACTIVE</span>
          </div>
          <div className="h-3.5 w-px bg-white/10" />
          <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <span className="font-bold text-white">{jobs.length}</span>
            <span>Open Roles</span>
          </div>
          <div className="h-3.5 w-px bg-white/10" />
          <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <span className="font-bold text-emerald-400">62.5%</span>
            <span>Avg Cutoff</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/careers', '_blank')}
            className="border-white/[0.12] hover:bg-slate-800/80 text-slate-300 font-medium"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            <span>Public Careers Hub</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="shadow-sm shadow-emerald-950/40 font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5 stroke-[2.2]" />
            <span>New Requisition</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/[0.08] shadow-inner">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Openings</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">{jobs.length}</div>
          <span className="text-[11px] text-emerald-400 font-medium font-mono">100% Published</span>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/[0.08] shadow-inner">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total in Pool</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">{candidates.length}</div>
          <span className="text-[11px] text-slate-400 font-medium">Across requisitions</span>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/[0.08] shadow-inner">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Pass Threshold</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">62.5%</div>
          <span className="text-[11px] text-emerald-400 font-medium font-mono">Automated filter</span>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/[0.08] shadow-inner">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Screening Latency</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">&lt; 1s</div>
          <span className="text-[11px] text-slate-400 font-medium">Instant NLP parsing</span>
        </div>
      </div>

      {/* Requisitions Table Card */}
      <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl shadow-inner overflow-hidden">
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by REQ code, role or department..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-white/[0.1] rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500"
            />
          </div>
          <div className="text-xs text-slate-400 font-mono font-medium">
            Showing {filteredJobs.length} Requisitions
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/70 border-b border-white/[0.08] text-slate-400 font-semibold select-none">
                <th className="py-3 px-4">REQ Code</th>
                <th className="py-3 px-4">Position Title & Dept</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">ATS Threshold</th>
                <th className="py-3 px-4">Active Applicants</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {jobsLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading requisitions...
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No requisitions found.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const applicantCount = getCandidateCountForRole(job.title);
                  return (
                    <tr
                      key={job.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/candidates?q=${encodeURIComponent(job.title)}`)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-400">{job.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {job.title}
                        </div>
                        <div className="text-[11px] text-slate-400">{job.department} • {job.employment_type}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{job.location}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] border border-white/[0.08]">
                          {job.threshold}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 text-[11px]">
                          {applicantCount} candidates
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusIndicator
                          type="success"
                          emphasis="low"
                          pulse
                          label="Active"
                        />
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => navigate(`/candidates?q=${encodeURIComponent(job.title)}`)}
                          className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40"
                        >
                          <span>View Pool</span>
                          <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Requisition Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-white/[0.12] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  Create Job Requisition
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Publish a new opening and configure automated keyword matching criteria.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequisition} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Position Title *</label>
                <Input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Department</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-950 border border-white/[0.1] rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Platform">Platform</option>
                    <option value="Data & AI">Data & AI</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Product">Product</option>
                    <option value="Security">Security</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Employment Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-950 border border-white/[0.1] rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Location</label>
                  <Input
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Remote / San Francisco"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Experience Level</label>
                  <Input
                    value={newExp}
                    onChange={(e) => setNewExp(e.target.value)}
                    placeholder="e.g. 3+ years"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Job Description & Responsibilities *</label>
                <textarea
                  required
                  rows={4}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Detail candidate requirements, tech stack, and responsibilities..."
                  className="w-full text-xs p-3 bg-slate-950 border border-white/[0.1] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Required Skills & Tech Keywords (comma separated)
                </label>
                <Input
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  placeholder="e.g. React, TypeScript, GraphQL, Docker"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">Automated ATS Match Pass Threshold</label>
                  <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    {newThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="90"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Applicants with resume match ≥ {newThreshold}% will auto-advance to Screening.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={createJobMutation.isPending}
                  className="shadow-sm shadow-emerald-950/40"
                >
                  <Briefcase className="w-3.5 h-3.5 mr-1" />
                  <span>Publish Requisition</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
