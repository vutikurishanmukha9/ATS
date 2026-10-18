import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  MapPin,
  CheckCircle2,
  FileText,
  Upload,
  ArrowRight,
  Send,
  Layers,
  Search,
  TrendingUp,
  AlertCircle,
  Clock,
  ShieldCheck,
  XCircle,
  Award,
  Mail,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  useJobs,
  useApplyCandidate,
  useScanResume,
  useCandidateStatus,
  type JobRequisition,
  type ResumeScanResponse,
} from '../lib/api';
import { toast } from '../lib/toast';

export const CareersPage: React.FC = () => {
  const { data: jobs = [], isLoading: jobsLoading } = useJobs();
  const applyMutation = useApplyCandidate();
  const scanMutation = useScanResume();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'jobs' | 'scanner' | 'tracker'>('jobs');

  // Filter states for Jobs tab
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('All');

  // Application Modal state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobRequisition | null>(null);

  // Application form states
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantLocation, setApplicantLocation] = useState('');
  const [applicantLinkedin, setApplicantLinkedin] = useState('');
  const [applicantResumeText, setApplicantResumeText] = useState('');
  const [applicantFile, setApplicantFile] = useState<File | null>(null);

  // Pre-check ATS Scanner states
  const [scannerRole, setScannerRole] = useState(jobs[0]?.title || 'Senior Software Engineer');
  const [scannerText, setScannerText] = useState('');
  const [scannerFile, setScannerFile] = useState<File | null>(null);
  const [scanResult, setScanResult] = useState<ResumeScanResponse | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isParsingResume, setIsParsingResume] = useState(false);

  // Candidate Tracker states
  const [statusEmailInput, setStatusEmailInput] = useState('');
  const [queriedEmail, setQueriedEmail] = useState('');
  const {
    data: candidateStatus,
    isLoading: statusLoading,
    isError: statusError,
    error: statusErrorObj,
  } = useCandidateStatus(queriedEmail);

  // Derive departments
  const departments = ['All', ...Array.from(new Set(jobs.map((j) => j.department)))];

  const filteredJobs = jobs.filter((j) => {
    const matchesSearch =
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.required_skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDept = selectedDept === 'All' || j.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  // Helper to extract text from PDF or TXT
  const handleExtractFile = async (file: File, targetSetter: (val: string) => void) => {
    if (!file) return;

    if (file.type === 'text/plain') {
      const text = await file.text();
      targetSetter(text);
      toast.success('Resume plain text loaded');
      return;
    }

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      setIsParsingResume(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/v1/screening/extract-pdf', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error('PDF extraction failed');
        const data = await res.json();
        targetSetter(data.text || '');
        toast.success(`PDF parsed successfully (${data.word_count || 0} words)`);
      } catch (err) {
        toast.error('Failed to parse PDF text. Please paste resume text directly.');
      } finally {
        setIsParsingResume(false);
      }
    }
  };

  const handleRunScanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannerText.trim()) {
      toast.error('Please upload or paste resume text to analyze');
      return;
    }

    setIsScanning(true);
    try {
      const res = await scanMutation.mutateAsync({
        resume_text: scannerText,
        target_role: scannerRole,
      });
      setScanResult(res);
      toast.success('ATS resume evaluation calculated successfully');
    } catch (err: any) {
      toast.error(err.message || 'ATS evaluation failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    if (!applicantName || !applicantEmail || !applicantResumeText) {
      toast.error('Name, email, and resume text are required');
      return;
    }

    try {
      const res = await applyMutation.mutateAsync({
        full_name: applicantName,
        email: applicantEmail,
        phone: applicantPhone || undefined,
        location: applicantLocation || undefined,
        linkedin_url: applicantLinkedin || undefined,
        applied_role: selectedJob.title,
        resume_text: applicantResumeText,
      });

      toast.success(
        res.match_score >= (selectedJob.threshold || 60)
          ? `Application submitted! ATS match ${Math.round(res.match_score)}% qualified for screening.`
          : 'Application received and stored in database.'
      );

      // Clean form
      setApplyModalOpen(false);
      setApplicantName('');
      setApplicantEmail('');
      setApplicantPhone('');
      setApplicantLocation('');
      setApplicantLinkedin('');
      setApplicantResumeText('');
      setApplicantFile(null);

      // Switch to status tracker
      setQueriedEmail(applicantEmail);
      setStatusEmailInput(applicantEmail);
      setActiveTab('tracker');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit application');
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans w-full max-w-full overflow-x-hidden">
      {/* Enterprise Career Header */}
      <header className="h-16 bg-[#0B0F17]/95 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 lg:px-8 sticky top-0 z-30 select-none w-full">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-sm shadow-emerald-500/25">
              <Layers className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base tracking-tight text-white leading-none">
                  Crack it
                </span>
                <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  Portal
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium hidden md:inline mt-0.5">
                Talent & Opportunities
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('jobs')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'jobs'
                  ? 'bg-slate-800 text-white border border-white/[0.1] shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <span>Jobs</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scanner')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'scanner'
                  ? 'bg-slate-800 text-white border border-white/[0.1] shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Resume Matcher</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tracker')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'tracker'
                  ? 'bg-slate-800 text-white border border-white/[0.1] shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Track Status</span>
              <span className="sm:hidden">Status</span>
            </button>

            <div className="h-5 w-px bg-white/[0.08] mx-0.5 sm:mx-1 hidden md:block" />

            {/* Recruiter Login */}
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 bg-slate-900/90 hover:bg-slate-800 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-lg border border-white/[0.08] transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Recruiter</span>
              <span className="sm:hidden">Login</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* TAB 1: OPEN JOBS */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            {/* Hero Banner */}
            <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-inner space-y-4">
              <div className="max-w-2xl">
                <span className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider">
                  Open Opportunities
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight mt-1">
                  Build the future of recruitment engineering.
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                  Join our engineering, data, and infrastructure teams. We review every application using our high-precision ATS keyword screening pipeline with instant feedback.
                </p>
              </div>

              {/* Search & Department Filters */}
              <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-white/[0.08]">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by role title, tech stack (e.g. React, Python, Docker)..."
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-950 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {departments.map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setSelectedDept(dept)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                        selectedDept === dept
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                          : 'bg-slate-900 text-slate-400 border-white/[0.08] hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Jobs List */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="font-semibold text-slate-200">{filteredJobs.length} Positions Available</span>
                <span>Sorted by publication date</span>
              </div>

              {jobsLoading ? (
                <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-8 text-center text-xs text-slate-500">
                  Loading available requisitions...
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-12 text-center space-y-2">
                  <Briefcase className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-200">No positions match your search</p>
                  <p className="text-xs text-slate-400">Try adjusting your keyword filter or department selector.</p>
                </div>
              ) : (
                filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-slate-900/60 border border-white/[0.08] hover:border-emerald-500/40 rounded-2xl p-5 sm:p-6 transition-all shadow-inner space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-slate-400">{job.id}</span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-white/[0.06]">
                            {job.department}
                          </span>
                          <span className="text-[11px] text-slate-500">•</span>
                          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            {job.location}
                          </span>
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-white mt-1 font-display">
                          {job.title}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setScannerRole(job.title);
                            setActiveTab('scanner');
                          }}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          <span>Check ATS Fit</span>
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedJob(job);
                            setApplyModalOpen(true);
                          }}
                          className="shadow-sm shadow-emerald-950/40"
                        >
                          <span>Apply Now</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-slate-400 mr-1">Required:</span>
                      {job.required_skills.map((skill) => (
                        <span
                          key={skill}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-white/[0.06]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ATS RESUME SCANNER */}
        {activeTab === 'scanner' && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-inner space-y-3">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                Instant Applicant Pre-Check
              </span>
              <h1 className="text-2xl font-bold font-display text-white tracking-tight">
                1-Click ATS Resume Fit Scanner
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                See exactly how your resume is evaluated by our enterprise screening algorithm. We compute TF-IDF weighted keyword overlaps, technical skill recognition, and benchmark your fit before you submit.
              </p>

              <form onSubmit={handleRunScanner} className="space-y-4 pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Select Target Position
                    </label>
                    <select
                      value={scannerRole}
                      onChange={(e) => setScannerRole(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-950 border border-white/[0.1] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500"
                    >
                      {jobs.map((j) => (
                        <option key={j.id} value={j.title}>
                          {j.title} ({j.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Upload PDF/TXT Resume
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept=".pdf,.txt"
                        id="scanner-resume-file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setScannerFile(file);
                            handleExtractFile(file, setScannerText);
                          }
                        }}
                      />
                      <label
                        htmlFor="scanner-resume-file"
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-slate-300 bg-slate-950 hover:bg-slate-800 border border-white/[0.1] rounded-xl cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-400" />
                        <span>{scannerFile ? scannerFile.name : 'Choose PDF or TXT file'}</span>
                      </label>
                      {isParsingResume && (
                        <span className="text-xs text-amber-400 animate-pulse font-medium">Extracting...</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      Resume Content / Text
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {scannerText.split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={scannerText}
                    onChange={(e) => setScannerText(e.target.value)}
                    placeholder="Paste or upload your complete resume text here (experience, skills, technical projects)..."
                    className="w-full text-xs p-3.5 bg-slate-950 border border-white/[0.1] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={isScanning}
                    className="shadow-sm shadow-emerald-950/40 px-4"
                  >
                    <span>Run ATS Match Analysis</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </form>
            </div>

            {/* Scan Results Panel */}
            {scanResult && (
              <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-inner space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 font-mono">BENCHMARK RESULT</span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          scanResult.is_accepted
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {scanResult.decision}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold font-display text-white mt-1">
                      {scanResult.recommendation}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">{scanResult.summary_reason}</p>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-950 px-4 py-3 rounded-xl border border-white/[0.08]">
                    <div className="text-right">
                      <span className="block text-[11px] font-semibold text-slate-400">Overall Match</span>
                      <span className="text-xs text-slate-500 font-mono">Threshold: {scanResult.threshold}%</span>
                    </div>
                    <div
                      className={`text-2xl font-bold font-mono px-3 py-1 rounded-lg border ${
                        scanResult.score >= scanResult.threshold
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                          : 'bg-rose-950/80 text-rose-400 border-rose-500/40'
                      }`}
                    >
                      {Math.round(scanResult.score)}%
                    </div>
                  </div>
                </div>

                {/* Multi-Dimensional Component Breakdown */}
                {scanResult.breakdown && (
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-white/[0.08] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Multi-Factor Enterprise ATS Scoring Rubric</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">Weighted Algorithm</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
                      {[
                        { label: 'Keywords Overlap', value: scanResult.breakdown.keywords ?? scanResult.breakdown.keyword_overlap, weight: '40%' },
                        { label: 'Skills Coverage', value: scanResult.breakdown.skills ?? scanResult.breakdown.skills_coverage, weight: '20%' },
                        { label: 'Experience Fit', value: scanResult.breakdown.experience ?? scanResult.breakdown.experience_fit, weight: '15%' },
                        { label: 'Achievements', value: scanResult.breakdown.achievements ?? scanResult.breakdown.quantified_achievements, weight: '15%' },
                        { label: 'Formatting & Sections', value: scanResult.breakdown.formatting ?? scanResult.breakdown.formatting_structure, weight: '10%' },
                      ].map((item) => (
                        <div key={item.label} className="bg-slate-900 p-2.5 rounded-lg border border-white/[0.06] space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-300 truncate">{item.label}</span>
                            <span className="font-mono font-bold text-white">{Math.round(item.value || 0)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, item.value || 0))}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 block text-right font-medium">{item.weight} weight</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Matched Keywords */}
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-white/[0.08] space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 stroke-[2]" />
                      <span>Matched Keywords ({scanResult.matched_keywords?.length || 0})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {scanResult.matched_keywords?.map((k: string) => (
                        <span
                          key={k}
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Missing Keywords / Recommendations */}
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-white/[0.08] space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <AlertCircle className="w-4 h-4 text-amber-400 stroke-[2]" />
                      <span>Missing Keywords to Add</span>
                    </div>
                    <div className="space-y-1.5">
                      {scanResult.missing_keywords?.critical?.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Critical Gaps:</span>
                          <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {scanResult.missing_keywords.critical.map((k: string) => (
                              <span key={k} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-500/30">
                                {k}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {scanResult.missing_keywords?.important?.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Important Stack:</span>
                          <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {scanResult.missing_keywords.important.map((k: string) => (
                              <span key={k} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-500/30">
                                {k}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quantified Achievements Detected */}
                {scanResult.achievements_detected && scanResult.achievements_detected.length > 0 && (
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-white/[0.08] space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Award className="w-4 h-4 text-emerald-400" />
                      <span>Detected Quantifiable Impact Achievements ({scanResult.achievements_detected.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {scanResult.achievements_detected.slice(0, 4).map((ach: any, i: number) => {
                        const clauseText = typeof ach === 'string' ? ach : (ach.clause || JSON.stringify(ach));
                        const verb = typeof ach === 'object' && ach.verb ? `[${ach.verb.toUpperCase()}] ` : '';
                        return (
                          <div key={i} className="text-xs bg-slate-900 p-2.5 rounded-lg border border-white/[0.06] text-slate-200 flex items-start gap-2 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0" />
                            <div className="font-mono text-[11px] leading-relaxed">
                              {verb && <span className="font-bold text-emerald-400">{verb}</span>}
                              <span>{clauseText}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Apply with this resume button */}
                <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Satisfied with your match? Proceed to submit your application directly.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const matched = jobs.find((j) => j.title.toLowerCase() === scannerRole.toLowerCase()) || jobs[0];
                      setSelectedJob(matched);
                      setApplicantResumeText(scannerText);
                      setApplyModalOpen(true);
                    }}
                    className="shadow-sm shadow-emerald-950/40"
                  >
                    <span>Apply for {scannerRole}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: APPLICATION STATUS TRACKER (STUDENT LOGIN) */}
        {activeTab === 'tracker' && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-inner space-y-4">
              <span className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider">
                Candidate Self-Service
              </span>
              <h1 className="text-2xl font-bold font-display text-white tracking-tight">
                Track Your Application Status
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
                Enter your application email address to see your real-time recruitment stage, interview progress, and ATS evaluation notes.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!statusEmailInput.trim()) {
                    toast.error('Please enter your email');
                    return;
                  }
                  setQueriedEmail(statusEmailInput.trim());
                }}
                className="flex flex-col sm:flex-row gap-2.5 max-w-lg pt-2"
              >
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    value={statusEmailInput}
                    onChange={(e) => setStatusEmailInput(e.target.value)}
                    placeholder="applicant@university.edu"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-white/[0.1] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                <Button type="submit" variant="primary" size="sm" loading={statusLoading}>
                  <Search className="w-3.5 h-3.5 mr-1" />
                  <span>Check Status</span>
                </Button>
              </form>
            </div>

            {/* Status Display Card */}
            {statusLoading && (
              <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-8 text-center text-xs text-slate-400">
                Looking up active application records...
              </div>
            )}

            {statusError && queriedEmail && (
              <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-6 text-center space-y-2">
                <XCircle className="w-8 h-8 text-rose-400 mx-auto" />
                <h3 className="text-sm font-bold text-rose-300">Application Not Found</h3>
                <p className="text-xs text-rose-400 max-w-md mx-auto">
                  {(statusErrorObj as any)?.message || `No active record found for ${queriedEmail}. Please check the spelling or submit a new application.`}
                </p>
              </div>
            )}

            {candidateStatus && (
              <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-inner space-y-6">
                {/* Header Information */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/[0.08]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-bold font-display text-white">
                        {candidateStatus.full_name}
                      </h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                        {candidateStatus.current_stage}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Applied for <strong className="text-white font-semibold">{candidateStatus.applied_role}</strong> on{' '}
                      {new Date(candidateStatus.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {candidateStatus.match_score !== null && (
                    <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-xl border border-white/[0.08]">
                      <span className="text-xs text-slate-400">ATS Keyword Match:</span>
                      <span className="text-sm font-bold font-mono text-emerald-400">
                        {Math.round(candidateStatus.match_score)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Enterprise Pipeline Step Tracker */}
                <div className="py-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 font-mono">
                    Recruitment Progress Pipeline
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: 'applied', label: '1. Applied', desc: 'Application received' },
                      { key: 'screening', label: '2. Screening', desc: 'Resume & keyword evaluation' },
                      { key: 'interview', label: '3. Technical Interview', desc: 'Engineering debrief' },
                      { key: 'offer', label: '4. Decision / Offer', desc: 'Final hiring verdict' },
                    ].map((step, idx) => {
                      const stagesOrder = ['applied', 'screening', 'interview', 'technical', 'offer', 'hired'];
                      const currentIdx = stagesOrder.indexOf(candidateStatus.current_stage);
                      const isPast = currentIdx > idx;
                      const isCurrent = currentIdx === idx;
                      const isRejected = candidateStatus.current_stage === 'rejected';

                      return (
                        <div
                          key={step.key}
                          className={`p-3 rounded-xl border transition-all ${
                            isRejected && isCurrent
                              ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                              : isCurrent
                              ? 'bg-emerald-950/70 border-emerald-500/80 ring-1 ring-emerald-500/40 text-emerald-200 font-semibold'
                              : isPast
                              ? 'bg-slate-900 border-white/[0.08] text-slate-300'
                              : 'bg-slate-950 border-white/[0.04] text-slate-500'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold">{step.label}</span>
                            {isPast && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                          <p className="text-[11px] mt-1 opacity-80">{step.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Audit Timeline */}
                <div className="space-y-3 pt-4 border-t border-white/[0.08]">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Application History & Milestone Events
                  </h3>
                  <div className="space-y-2">
                    {candidateStatus.timeline.map((event, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 bg-slate-950/60 border border-white/[0.06] rounded-xl text-xs"
                      >
                        <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">
                              {event.from_stage ? (
                                <>
                                  Status updated from <strong className="capitalize">{event.from_stage}</strong> to{' '}
                                  <strong className="capitalize text-emerald-400">{event.to_stage}</strong>
                                </>
                              ) : (
                                <>Application registered in database ({event.to_stage})</>
                              )}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {new Date(event.created_at).toLocaleString()}
                            </span>
                          </div>
                          {event.reason && (
                            <p className="text-xs text-slate-400 italic mt-1">
                              Note: "{event.reason}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Direct Application Modal */}
      {applyModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/[0.12] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  Apply for {selectedJob.title}
                </h3>
                <span className="text-xs text-slate-400">{selectedJob.department} • {selectedJob.location}</span>
              </div>
              <button
                type="button"
                onClick={() => setApplyModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitApplication} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                  <Input
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
                  <Input
                    type="email"
                    required
                    value={applicantEmail}
                    onChange={(e) => setApplicantEmail(e.target.value)}
                    placeholder="applicant@university.edu"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                  <Input
                    value={applicantPhone}
                    onChange={(e) => setApplicantPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Location</label>
                  <Input
                    value={applicantLocation}
                    onChange={(e) => setApplicantLocation(e.target.value)}
                    placeholder="City, State / Remote"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">LinkedIn or Portfolio URL</label>
                <Input
                  value={applicantLinkedin}
                  onChange={(e) => setApplicantLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/applicant"
                />
              </div>

              {/* Resume File Upload or Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Upload Resume File (PDF/TXT)</label>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  id="apply-resume-file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setApplicantFile(f);
                      handleExtractFile(f, setApplicantResumeText);
                    }
                  }}
                />
                <label
                  htmlFor="apply-resume-file"
                  className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-slate-300 bg-slate-950 hover:bg-slate-800 border border-white/[0.1] rounded-xl cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  <span>{applicantFile ? applicantFile.name : 'Upload PDF / TXT resume'}</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Resume Content / Plain Text *</label>
                <textarea
                  required
                  rows={4}
                  value={applicantResumeText}
                  onChange={(e) => setApplicantResumeText(e.target.value)}
                  placeholder="Paste or review resume text..."
                  className="w-full text-xs p-3 bg-slate-950 border border-white/[0.1] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setApplyModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={applyMutation.isPending}
                  className="shadow-sm shadow-emerald-950/40"
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  <span>Submit Application</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
