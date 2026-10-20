import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Briefcase, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { ErrorBanner } from '../components/ui/error-banner';
import { useLogin } from '../lib/api';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid work email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        setErrorMessage('Too many failed attempts. Please wait a few minutes before trying again.');
      } else if (err.status === 401) {
        setErrorMessage('Invalid email or password. Please verify your credentials.');
      } else {
        setErrorMessage(err.message || 'Unable to sign in. Please verify your connection.');
      }
    }
  };

  const handleFillDemo = () => {
    setValue('email', 'recruiter@company.com', { shouldValidate: true });
    setValue('password', 'Password123!', { shouldValidate: true });
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col items-center justify-center p-4 relative select-none w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-[380px] space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 text-emerald-400 mb-1 shadow-sm">
            <Briefcase className="w-5 h-5 stroke-[2]" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Sign in to Crack it
          </h1>
          <p className="text-xs text-slate-400">
            Recruitment management and candidate pipeline
          </p>
        </div>

        {/* Clean Auth Card */}
        <div className="bg-[#0E131F] rounded-xl border border-slate-800 shadow-xl p-6 space-y-4">
          {errorMessage && <ErrorBanner message={errorMessage} />}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Work email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" aria-hidden="true" />
                <input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="name@company.com"
                  {...register('email')}
                  className={`w-full h-9 pl-9 pr-3 text-xs bg-[#090D16] border rounded-lg text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-1 ${
                    errors.email
                      ? 'border-rose-500/80 focus:ring-rose-500/30'
                      : 'border-slate-800 hover:border-slate-700 focus:border-slate-600 focus:ring-slate-600'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-rose-400 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" aria-hidden="true" />
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  {...register('password')}
                  className={`w-full h-9 pl-9 pr-3 text-xs bg-[#090D16] border rounded-lg text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-1 ${
                    errors.password
                      ? 'border-rose-500/80 focus:ring-rose-500/30'
                      : 'border-slate-800 hover:border-slate-700 focus:border-slate-600 focus:ring-slate-600'
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
              className="w-full h-9 mt-1 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              {isSubmitting || loginMutation.isPending ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Discreet Demo Account Helper */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Demo account:</span>
            <button
              type="button"
              onClick={handleFillDemo}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              <span>Fill demo credentials</span>
            </button>
          </div>
        </div>

        {/* Quiet Footer */}
        <p className="text-center text-[11px] text-slate-500">
          Protected by role-based authentication and audit logging.
        </p>
      </div>
    </div>
  );
};
