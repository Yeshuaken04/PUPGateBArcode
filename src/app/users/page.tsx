'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { UserCog, Shield, CheckCircle2, XCircle, Plus, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([
    {
      id: 'u1',
      full_name: 'System Super Administrator',
      role: 'super_admin',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'u2',
      full_name: 'PUP Gate Guard 01',
      role: 'guard',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'u3',
      full_name: 'Campus Security Operator',
      role: 'admin',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  return (
    <DashboardLayout
      title="System Users & Role-Based Access Control (RBAC)"
      subtitle="Manage authorized staff, gate security guards, and assign system permissions"
    >
      <div className="space-y-4">
        {/* Role Permissions Card */}
        <div className="grid gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-3.5 text-xs text-purple-900">
            <div className="font-black">Super Admin</div>
            <div className="text-[11px] text-purple-700 mt-1">Full system control, manage admins, security keys.</div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-xs text-blue-900">
            <div className="font-black">Admin</div>
            <div className="text-[11px] text-blue-700 mt-1">Manage students, vehicles, gates, reports & overrides.</div>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3.5 text-xs text-indigo-900">
            <div className="font-black">Faculty</div>
            <div className="text-[11px] text-indigo-700 mt-1">Limited portal: view attendance & upload verification lists.</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900">
            <div className="font-black">Guard</div>
            <div className="text-[11px] text-emerald-700 mt-1">Monitor live scans, audit access, manual open.</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-3.5 text-xs text-slate-800">
            <div className="font-black">Viewer</div>
            <div className="text-[11px] text-slate-600 mt-1">Read-only audit reports and analytics access.</div>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Account Status</th>
                <th className="px-4 py-3">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3 font-bold text-slate-900">{p.full_name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-pup-100 px-2.5 py-0.5 text-xs font-bold text-pup-800 uppercase">
                      {p.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                      <CheckCircle2 className="h-3 w-3" /> ACTIVE
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
