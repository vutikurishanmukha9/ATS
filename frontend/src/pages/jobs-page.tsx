import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Search,
  Plus,
  ExternalLink,
  ArrowUpRight,
  SlidersHorizontal,
} from 'lucide-react';
import { useJobs, useCreateJob, useCandidates } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { StatusIndicator } from '../components/ui/status-indicator';
import { toast } from 'sonner';

export const JobsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: jobs = [], isLoading: jobsLoading } = useJobs();
  const { data: candidatesData } = useCandidates({ page_size: 100 });
  const candidates = candidatesData?.items || [];
  const createJobMutation = useCreateJob();

  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Form states for new job modal
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

      toast.success(`Job requisition "${newTitle}" created successfully`);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>ATS</span>
            <span>/</span>
            <span className="text-slate-400">Requisitions</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
            Job Requisitions
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Active roles, automated screening criteria, and applicant distribution.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/careers', '_blank')}
            className="border-slate-800 hover:bg-slate-800/80 text-slate-300 font-medium text-xs h-8"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            <span>Public Portal</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="font-medium text-xs h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>New Requisition</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0E131F] p-4 rounded-lg border border-slate-800">
          <span className="text-xs font-medium text-slate-400">Active Roles</span>
          <div className="text-2xl font-semibold tracking-tight text-white mt-1">{jobs.length}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Published requisitions</span>
        </div>

        <div className="bg-[#0E131F] p-4 rounded-lg border border-slate-800">
          <span className="text-xs font-medium text-slate-400">Candidates in Pool</span>
          <div className="text-2xl font-semibold tracking-tight text-white mt-1">{candidates.length}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Across all openings</span>
        </div>

        <div className="bg-[#0E131F] p-4 rounded-lg border border-slate-800">
          <span className="text-xs font-medium text-slate-400">Avg Match Threshold</span>
          <div className="text-2xl font-semibold tracking-tight text-white mt-1">62.5%</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Auto-screening cutoff</span>
        </div>

        <div className="bg-[#0E131F] p-4 rounded-lg border border-slate-800">
          <span className="text-xs font-medium text-slate-400">Screening Latency</span>
          <div className="text-2xl font-semibold tracking-tight text-white mt-1">&lt; 1s</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Resume keyword parsing</span>
        </div>
      </div>

      {/* Requisitions Table Card */}
      <div className="bg-[#0E131F] border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter requisitions..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#090D16] border border-slate-800 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-600 focus:border-slate-600"
            />
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {filteredJobs.length} {filteredJobs.length === 1 ? 'requisition' : 'requisitions'}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#090D16] border-b border-slate-800 text-slate-400 font-medium select-none">
                <th className="py-2.5 px-4">Code</th>
                <th className="py-2.5 px-4">Role Title & Department</th>
                <th className="py-2.5 px-4">Location</th>
                <th className="py-2.5 px-4">Pass Cutoff</th>
                <th className="py-2.5 px-4">Applicants</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {jobsLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading requisitions...
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No requisitions found matching "{search}".
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
                      <td className="py-3 px-4 font-mono text-slate-400">{job.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-100 group-hover:text-white transition-colors">
                          {job.title}
                        </div>
                        <div className="text-[11px] text-slate-500">{job.department} • {job.employment_type}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{job.location}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                          {job.threshold}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-slate-300">
                          {applicantCount} {applicantCount === 1 ? 'applicant' : 'applicants'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusIndicator
                          type="success"
                          emphasis="low"
                          label="Open"
                        />
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => navigate(`/candidates?q=${encodeURIComponent(job.title)}`)}
                          className="text-xs text-slate-400 hover:text-white h-7"
                        >
                          <span>Candidates</span>
                          <ArrowUpRight className="w-3 h-3 ml-1" />
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-[#0E131F] border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Create Requisition
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Publish a new position and configure automated screening rules.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequisition} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Position Title *</label>
                <Input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Department</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full text-xs p-2 bg-[#090D16] border border-slate-800 rounded-md text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-600"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Platform">Platform</option>
                    <option value="Data & AI">Data & AI</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Product">Product</option>
                    <option value="Design">Design</option>
                    <option value="Security">Security</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Employment Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full text-xs p-2 bg-[#090D16] border border-slate-800 rounded-md text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-600"
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
                  <label className="block font-medium text-slate-300 mb-1">Location</label>
                  <Input
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Remote / San Francisco"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Experience Level</label>
                  <Input
                    value={newExp}
                    onChange={(e) => setNewExp(e.target.value)}
                    placeholder="e.g. 3+ years"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Job Description & Responsibilities *</label>
                <textarea
                  required
                  rows={4}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Summarize candidate expectations, tech stack, and scope..."
                  className="w-full text-xs p-2.5 bg-[#090D16] border border-slate-800 rounded-md text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-600"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Required Skills & Keywords (comma-separated)
                </label>
                <Input
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  placeholder="e.g. Python, FastAPI, Docker, PostgreSQL"
                />
              </div>

              <div className="p-3 bg-[#090D16] border border-slate-800 rounded-md space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium text-slate-300">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                    <span>Automated Screening Cutoff</span>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
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
                <p className="text-[11px] text-slate-500">
                  Applicants with resume keyword match ≥ {newThreshold}% will advance to Screening.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateModalOpen(false)}
                  className="border-slate-800 text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={createJobMutation.isPending}
                  className="text-xs h-8"
                >
                  <Briefcase className="w-3.5 h-3.5 mr-1" />
                  <span>Create Requisition</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
