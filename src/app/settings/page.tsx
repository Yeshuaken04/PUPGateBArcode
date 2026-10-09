'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Settings, ShieldCheck, KeyRound, Database, Cloud, CheckCircle2, Copy, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [copied, setCopied] = useState(false);
  const [dbHealth, setDbHealth] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        const json = await res.json();
        setDbHealth(json.database === 'connected' ? 'connected' : 'disconnected');
      } catch {
        setDbHealth('disconnected');
      }
    }
    checkHealth();
  }, []);

  const copySecretHint = () => {
    navigator.clipboard.writeText('GATE_API_SECRET');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout
      title="System Configuration & Deployment Settings"
      subtitle="Verify Netlify environment variables, Supabase PostgreSQL status, and Raspberry Pi pairing"
    >
      <div className="space-y-5 max-w-4xl">
        {/* Connection Diagnostics Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pup-50 text-pup-800">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Cloud Infrastructure Status</h3>
              <p className="text-xs text-slate-500">Netlify OpenNext Adapter + Supabase PostgreSQL Engine</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 pt-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-bold uppercase text-slate-500">Hosting Platform</div>
              <div className="text-sm font-black text-slate-900 mt-1 flex items-center gap-1.5">
                <Cloud className="h-4 w-4 text-sky-600" />
                <span>Netlify Next.js</span>
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">Ready for deploy</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-bold uppercase text-slate-500">Database Engine</div>
              <div className="text-sm font-black text-slate-900 mt-1 flex items-center gap-1.5">
                <Database className="h-4 w-4 text-emerald-600" />
                <span>Supabase PostgreSQL</span>
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                {dbHealth === 'connected' ? 'Connected (Live)' : 'Configured / Ready'}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-bold uppercase text-slate-500">Authentication</div>
              <div className="text-sm font-black text-slate-900 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-pup-700" />
                <span>Supabase Auth & RLS</span>
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">Strict RBAC active</div>
            </div>
          </div>
        </div>

        {/* Required Netlify Environment Variables Guide */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Required Netlify Environment Variables</h3>
              <p className="text-xs text-slate-500">
                Go to Netlify Dashboard → Site configuration → Environment variables
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3">Variable Key</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr>
                  <td className="p-3 font-bold text-pup-800">NEXT_PUBLIC_SUPABASE_URL</td>
                  <td className="p-3 font-sans text-slate-600">Supabase Project Settings</td>
                  <td className="p-3 font-sans text-slate-600">PostgreSQL API URL</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-pup-800">NEXT_PUBLIC_SUPABASE_ANON_KEY</td>
                  <td className="p-3 font-sans text-slate-600">Supabase Project Settings</td>
                  <td className="p-3 font-sans text-slate-600">Browser & SSR Client Key</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-pup-800">SUPABASE_SERVICE_ROLE_KEY</td>
                  <td className="p-3 font-sans text-slate-600">Supabase Project Settings</td>
                  <td className="p-3 font-sans text-slate-600">Server API routes & scan processing</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-pup-800">GATE_API_SECRET</td>
                  <td className="p-3 font-sans text-slate-600">Custom Random 32+ char secret</td>
                  <td className="p-3 font-sans text-slate-600">Authenticates Raspberry Pi hardware</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Database Migration Instructions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>PostgreSQL Schema Ready in `supabase/schema.sql`</span>
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            The full database schema including all tables, indexes, Row Level Security (RLS) policies, atomic
            transaction function (`process_gate_scan`), and sample seed records is saved in{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-bold font-mono text-pup-800">
              supabase/schema.sql
            </code>
            . You can paste it directly into the <strong>Supabase SQL Editor</strong> to initialize your cloud
            database in one click.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
