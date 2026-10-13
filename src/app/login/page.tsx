'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const DEMO_ACCOUNTS = [
  { username: 'admin', password: 'PUPBataan@123', full_name: 'System Administrator', role: 'admin', email: 'admin@pup.edu.ph' },
  { username: 'guard', password: 'guard123', full_name: 'PUP Gate Guard', role: 'guard', email: 'guard@pup.edu.ph' },
  { username: 'operator', password: 'operator123', full_name: 'Security Operator', role: 'admin', email: 'operator@pup.edu.ph' },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError('Please enter a username and password.');
      setBusy(false);
      return;
    }

    try {
      // 1. Check authorized system accounts
      const matched = DEMO_ACCOUNTS.find(
        (a) => (a.username.toLowerCase() === cleanUser || a.email.toLowerCase() === cleanUser) && a.password === cleanPass
      );

      if (matched) {
        document.cookie = `pup_gate_demo_session=${matched.role}; path=/; max-age=86400; SameSite=Lax`;
        if (typeof window !== 'undefined') {
          localStorage.setItem('pup_gate_token', `local-session-${Date.now()}`);
          localStorage.setItem('pup_gate_user', JSON.stringify({
            id: matched.username,
            full_name: matched.full_name,
            role: matched.role,
            email: matched.email,
          }));
        }
        router.push('/dashboard');
        return;
      }

      // 2. Try Supabase Auth
      try {
        const supabase = createClient();
        const emailToTry = cleanUser.includes('@') ? cleanUser : `${cleanUser}@pup.edu.ph`;
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: emailToTry,
          password: cleanPass,
        });

        if (!authError && data?.user) {
          document.cookie = `pup_gate_demo_session=admin; path=/; max-age=86400; SameSite=Lax`;
          router.push('/dashboard');
          return;
        }
      } catch {
        // ignore Supabase connectivity issues and fallback
      }

      setError('Invalid username or password. Please verify your campus credentials.');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#9b1022_0%,_#6f0010_35%,_#250307_100%)] p-4 sm:p-6 md:p-8 flex items-center justify-center">
      <div className="mx-auto grid min-h-[90vh] w-full max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-2xl md:grid-cols-[1.1fr_0.9fr]">
        
        {/* Left Side: Brand & Feature Showcase */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 p-8 sm:p-10 md:p-12 text-white flex flex-col justify-between">
          {/* Subtle Dot Pattern */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 20%, white 0 2px, transparent 2.5px)',
              backgroundSize: '28px 28px',
            }}
          />

          {/* Watermark PUP Logo */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'url(/logo200.svg)',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '420px',
              filter: 'drop-shadow(0 0 18px rgba(255,255,255,0.08))',
            }}
          />

          {/* Dark Overlay Gradient */}
          <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(17,24,39,0.20),rgba(127,29,29,0.08),rgba(15,23,42,0.25))] pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10 flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-1.5 shadow-md">
              <img src="/logo200.svg" alt="PUP Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">PUP BATAAN</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-red-200">
                Automated Vehicle Gate Pass & Barrier System
              </div>
            </div>
          </div>

          {/* Center Pitch Content */}
          <div className="relative z-10 my-8 max-w-lg">
            <h1 className="text-3xl sm:text-4xl font-black leading-tight text-white">
              Secure campus access, built for vehicle stickers and barrier control.
            </h1>
            <p className="mt-4 text-xs sm:text-sm leading-6 text-red-100/90">
              Fullstack web portal with barcode stickers, RFID verification, Excel bulk upload, live camera scanning, and automated barrier synchronization.
            </p>

            {/* Feature Badges Grid */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                'Admin & Guard authorized access',
                'Visual Barcode & RFID Gate Passes',
                'Live Camera Barcode Scanner',
                'Supabase DB & SQLite Offline Sync',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/10 p-3.5 text-xs sm:text-sm backdrop-blur-sm text-white font-medium flex items-center gap-2.5"
                >
                  <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Institutional Security Notice */}
          <div className="relative z-10 pt-4 border-t border-white/10 text-xs text-red-200/80 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Authorized PUP personnel and security officers only.</span>
          </div>
        </section>

        {/* Right Side: Login Form */}
        <section className="flex flex-col justify-center p-8 sm:p-10 md:p-14 bg-white">
          <form className="w-full max-w-md mx-auto" onSubmit={handleSubmit}>
            {/* Mobile Brand Header */}
            <div className="mb-6 flex items-center gap-3 md:hidden">
              <img src="/logo200.svg" alt="PUP Logo" className="h-10 w-10 object-contain" />
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-pup-800">PUP Bataan</div>
                <div className="text-lg font-black text-slate-900">Vehicle Gate System</div>
              </div>
            </div>

            <div className="mb-1 text-xs font-bold uppercase tracking-[0.25em] text-pup-800">
              Secure Sign In
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Access the Control Panel</h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
              Sign in with your authorized campus credentials.
            </p>

            {/* Error Message */}
            {error && (
              <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Username Input */}
            <div className="mt-6">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Username or Email
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin or user@pup.edu.ph"
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-pup-700 focus:bg-white focus:ring-1 focus:ring-pup-700"
              />
            </div>

            {/* Password Input */}
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-pup-700 focus:bg-white focus:ring-1 focus:ring-pup-700"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={busy}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-pup-700 py-3.5 text-sm font-bold text-white shadow-md hover:bg-pup-800 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
            >
              <KeyRound className="h-4 w-4" />
              <span>{busy ? 'Signing in...' : 'Sign In'}</span>
            </button>


          </form>
        </section>
      </div>
    </div>
  );
}
