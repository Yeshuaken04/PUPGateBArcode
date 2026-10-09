'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { BarChart3, Download, Calendar, ArrowUpRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function ReportsPage() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const dailyData = [
    { label: '07 AM', entries: 60, exits: 10, denied: 1 },
    { label: '08 AM', entries: 210, exits: 15, denied: 3 },
    { label: '09 AM', entries: 120, exits: 30, denied: 0 },
    { label: '10 AM', entries: 80, exits: 50, denied: 1 },
    { label: '11 AM', entries: 95, exits: 90, denied: 2 },
    { label: '12 PM', entries: 140, exits: 160, denied: 1 },
    { label: '01 PM', entries: 110, exits: 105, denied: 0 },
    { label: '02 PM', entries: 75, exits: 145, denied: 1 },
    { label: '03 PM', entries: 50, exits: 190, denied: 0 },
  ];

  const handleExport = () => {
    const reportText = `PUP BATAAN AUTOMATED GATE SYSTEM - AUDIT REPORT\nGenerated at: ${new Date().toLocaleString()}\nPeriod: ${period.toUpperCase()}\nStatus: Verified\nTotal Inbound Entries: 940\nTotal Outbound Exits: 795\nAuthorized Scan Rate: 98.9%\nDenied Attempts: 9`;
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pup-bataan-gate-report-${period}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout
      title="Access Reports & Attendance Analytics"
      subtitle="Audit trails, peak gate traffic hours, authorization rates, and compliance export"
    >
      <div className="space-y-5">
        {/* Top Controls */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setPeriod('daily')}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                period === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                period === 'weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                period === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              This Month
            </button>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl bg-pup-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition"
          >
            <Download className="h-4 w-4" />
            <span>Export Official Report</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Total Scans</div>
            <div className="mt-2 text-2xl font-black text-slate-900">1,744</div>
            <div className="text-[11px] text-emerald-600 font-medium">98.9% Approval rate</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase text-emerald-700">Inbound Entries</div>
            <div className="mt-2 text-2xl font-black text-emerald-950">940</div>
            <div className="text-[11px] text-slate-400">Main Entrance Barrier</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase text-rose-700">Outbound Exits</div>
            <div className="mt-2 text-2xl font-black text-rose-950">795</div>
            <div className="text-[11px] text-slate-400">Main Exit Barrier</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase text-amber-700">Peak Traffic Hour</div>
            <div className="mt-2 text-2xl font-black text-slate-900">08:00 AM</div>
            <div className="text-[11px] text-slate-400">225 scans / hour</div>
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Gate Pass Distribution by Hour</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Bar dataKey="entries" name="Inbound Entries" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="exits" name="Outbound Exits" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="denied" name="Denied Scans" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
