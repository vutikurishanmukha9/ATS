import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layers, ArrowRight, Mail, Lock, Terminal, Copy, Check } from 'lucide-react';
import { ErrorBanner } from '../components/ui/error-banner';
import { useLogin } from '../lib/api';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCli, setCopiedCli] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setErrorMessage(null);
    try {
      await loginMutation.mutateAsync(values);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      if (err.status === 429) {
        setErrorMessage('Too many failed login attempts. Please wait 15 minutes before trying again.');
      } else if (err.status === 401) {
        setErrorMessage('Invalid email or password. Please verify your credentials.');
      } else {
        setErrorMessage(err.message || 'Unable to sign in. Please check your connection and try again.');
      }
    }
  };

  const handleFillDemo = () => {
    setValue('email', 'recruiter@company.com', { shouldValidate: true });
    setValue('password', 'Password123!', { shouldValidate: true });
  };

  const handleCopyCli = () => {
    navigator.clipboard.writeText('python -m app.cli create-first-user');
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-4 relative select-none w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-950/60 mb-1 border border-emerald-500/40">
            <Layers className="w-6 h-6 stroke-[2.2]" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-display">
            Welcome to Crack it
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Candidate management, hiring pipeline velocity, and recruitment operations.
          </p>
        </div>

        {/* Elevated Form Card */}
        <div className="bg-slate-900/80 rounded-2xl border border-white/[0.1] shadow-2xl p-7 space-y-5 backdrop-blur-md">
          {errorMessage && (
            <ErrorBanner message={errorMessage} />
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" aria-hidden="true" />
                <input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="recruiter@company.com"
                  {...register('email')}
                  className={`w-full h-10 pl-9 pr-3 text-sm bg-slate-950 border rounded-lg text-white placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 ${
                    errors.email
                      ? 'border-rose-500/80 focus:ring-rose-500/25'
                      : 'border-white/[0.1] hover:border-white/[0.18] focus:border-emerald-500 focus:ring-emerald-500/25'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-rose-400 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" aria-hidden="true" />
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  {...register('password')}
                  className={`w-full h-10 pl-9 pr-3 text-sm bg-slate-950 border rounded-lg text-white placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 ${
                    errors.password
                      ? 'border-rose-500/80 focus:ring-rose-500/25'
                      : 'border-white/[0.1] hover:border-white/[0.18] focus:border-emerald-500 focus:ring-emerald-500/25'
                  }`}
                />
              </div>
              {errors.password && (
                <p className="text-[11px] text-rose-400 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || loginMutation.isPending}
              className="w-full h-10 mt-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-sm font-semibold rounded-lg shadow-sm shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting || loginMutation.isPending ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign in to Dashboard</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.2]" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* 1-Click Demo Account Quick Fill */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Quick testing:</span>
            <button
              type="button"
              onClick={handleFillDemo}
              className="inline-flex items-center text-xs font-semibold text-emerald-300 hover:text-emerald-200 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            >
              Fill Demo Credentials
            </button>
          </div>
        </div>

        {/* First-Time Setup Helper Box */}
        <div className="bg-slate-900/50 backdrop-blur-xs rounded-xl border border-white/[0.06] p-3.5 text-xs text-slate-400 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300 text-[11px]">
              <Terminal className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span>Bootstrap Administrator CLI</span>
            </div>
            <button
              type="button"
              onClick={handleCopyCli}
              className="text-[11px] text-slate-400 hover:text-white inline-flex items-center gap-1"
              title="Copy CLI command"
            >
              {copiedCli ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-400 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <code className="block bg-slate-950 p-2 rounded-lg font-mono text-[11px] text-emerald-400 select-all border border-white/[0.06]">
            python -m app.cli create-first-user
          </code>
        </div>
      </div>
    </div>
  );
};
