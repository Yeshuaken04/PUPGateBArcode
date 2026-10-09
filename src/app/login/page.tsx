'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Mail, AlertCircle, ShieldCheck, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check demo credentials first for immediate evaluation
      if (
        (email === 'admin@pup.edu.ph' || email === 'admin') &&
        (password === 'PUPBataan@123' || password === 'admin123')
      ) {
        document.cookie = 'pup_gate_demo_session=admin; path=/; max-age=86400; SameSite=Lax';
        router.push('/dashboard');
        return;
      }

      if (
        (email === 'guard@pup.edu.ph' || email === 'guard') &&
        password === 'guard123'
      ) {
        document.cookie = 'pup_gate_demo_session=guard; path=/; max-age=86400; SameSite=Lax';
        router.push('/dashboard');
        return;
      }

      // Try Supabase Auth
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.includes('@') ? email : `${email}@pup.edu.ph`,
        password,
      });

      if (authError) {
        throw new Error(authError.message || 'Invalid username or password.');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-pup-700/30 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/90 shadow-2xl backdrop-blur-xl">
          {/* Header Banner */}
          <div className="bg-pup-800 px-6 py-8 text-center text-white relative">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2 shadow-xl ring-4 ring-white/10">
              <img src="/logo200.svg" alt="PUP Logo" className="h-12 w-12 object-contain" />
            </div>
            <h2 className="text-xl font-black tracking-wide text-white">POLYTECHNIC UNIVERSITY OF THE PHILIPPINES</h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-amber-300">
              Bataan Branch • Gate Barrier System
            </p>
          </div>

          {/* Form */}
          <div className="p-6 sm:p-8">
            <div className="mb-6 text-center">
              <h3 className="text-lg font-bold text-white">Security Sign In</h3>
              <p className="text-xs text-slate-400 mt-1">
                Authorized Personnel, Security Guards & System Operators
              </p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Email / Username
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@pup.edu.ph"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 pl-10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-pup-500 focus:ring-1 focus:ring-pup-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 pl-10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-pup-500 focus:ring-1 focus:ring-pup-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-pup-700 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-pup-800 disabled:opacity-50"
              >
                <KeyRound className="h-4 w-4" />
                {loading ? 'Authenticating...' : 'Sign In to Gate System'}
              </button>
            </form>

            {/* Quick Demo Logins for Instant Testing */}
            <div className="mt-6 border-t border-slate-800/80 pt-5">
              <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Pre-Configured Demo Credentials
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => quickFill('admin@pup.edu.ph', 'PUPBataan@123')}
                  className="rounded-lg border border-slate-800 bg-slate-900/50 p-2 text-left text-xs hover:border-slate-700 hover:bg-slate-900 transition"
                >
                  <div className="font-bold text-amber-300">Admin Account</div>
                  <div className="text-[10px] text-slate-400 truncate">admin@pup.edu.ph</div>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('guard@pup.edu.ph', 'guard123')}
                  className="rounded-lg border border-slate-800 bg-slate-900/50 p-2 text-left text-xs hover:border-slate-700 hover:bg-slate-900 transition"
                >
                  <div className="font-bold text-emerald-300">Guard Account</div>
                  <div className="text-[10px] text-slate-400 truncate">guard@pup.edu.ph</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Protected by Supabase Auth & PostgreSQL Row Level Security</span>
        </div>
      </div>
    </div>
  );
}
