'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { UserCog, Shield, CheckCircle2, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';

export default function UsersPage() {
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([
    {
      id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      full_name: 'PUP Campus Administrator',
      role: 'admin',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e',
      full_name: 'PUP Campus Gate Guard',
      role: 'guard',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  useEffect(() => {
    async function loadProfiles() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
        if (!error && data && data.length > 0) {
          // Normalize to Admin and Guard only
          const normalized = data
            .filter((p) => p.full_name !== 'Campus Security Operator')
            .map((p) => ({
              ...p,
              role: p.role === 'guard' ? 'guard' : 'admin',
            }));
          setProfiles(normalized);
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    loadProfiles();
  }, []);

  return (
    <DashboardLayout
      title="System Users & Role-Based Access Control (RBAC)"
      subtitle="Pamamahala ng mga awtorisadong Administrator at Gate Security Guards"
    >
      <div className="space-y-4 max-w-4xl">
        {/* Strictly 2 Roles Permission Summary */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-pup-200 bg-pup-50/70 p-4 text-xs text-pup-950">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-pup-800" />
              <span className="font-black text-sm text-pup-900">Administrator (Admin)</span>
            </div>
            <p className="text-slate-600 mt-2 leading-relaxed text-[12px]">
              Buong kontrol sa system: Student Directory, Excel Bulk Upload, Vehicle Registry, Barcode ID Passes, Gate Barrier Controls, Audit Logs & Analytics, at Settings.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-700" />
              <span className="font-black text-sm text-emerald-900">Security Guard (Guard)</span>
            </div>
            <p className="text-slate-600 mt-2 leading-relaxed text-[12px]">
              Gate access operation: Live Camera Barcode / QR Scanner, Barrier Manual Trigger, Verification ng mga pumapasok/lumalabas, at pag-issue ng Temporary Visitor Pass.
            </p>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Pangalan (Full Name)</th>
                <th className="px-4 py-3">Tungkulin (Role)</th>
                <th className="px-4 py-3">Access Scope</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map((p) => {
                const isAdmin = p.role === 'admin' || p.role === 'super_admin';
                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">{p.full_name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                          isAdmin ? 'bg-pup-100 text-pup-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isAdmin ? 'ADMINISTRATOR' : 'SECURITY GUARD'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                      {isAdmin ? 'Full System & Management' : 'Live Gate Scanner & Visitor Access'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                        <CheckCircle2 className="h-3 w-3" /> ACTIVE
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
