'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { BarChart3, Download, Calendar, ArrowUpRight, ShieldCheck, ShieldAlert, RefreshCw } from 'lucide-react';
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

interface HourlyData {
  label: string;
  entries: number;
  exits: number;
  denied: number;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    studentCount: 0,
    facultyCount: 0,
    visitorCount: 0,
    vehicleCount: 0,
    insideCount: 0,
    entriesToday: 0,
    exitsToday: 0,
    deniedToday: 0,
    totalScans: 0,
    approvalRate: '100.0',
    hourlyDistribution: [] as HourlyData[],
  });

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?period=${period}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setStats(json.data);
      }
    } catch {
      // keep 0
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [period]);

  const peakHour = useMemo(() => {
    if (!stats.hourlyDistribution || stats.hourlyDistribution.length === 0) return { label: 'None', total: 0 };
    let best = { label: 'None', total: 0 };
    for (const h of stats.hourlyDistribution) {
      const tot = h.entries + h.exits;
      if (tot > best.total) {
        best = { label: h.label, total: tot };
      }
    }
    return best;
  }, [stats.hourlyDistribution]);

  const handleExport = () => {
    const reportText = `PUP BATAAN AUTOMATED GATE SYSTEM - OFFICIAL AUDIT REPORT
Generated at: ${new Date().toLocaleString()}
Period: ${period.toUpperCase()}
Status: Verified Cloud PostgreSQL Records
Total Scans: ${stats.totalScans}
Inbound Entries: ${stats.entriesToday}
Outbound Exits: ${stats.exitsToday}
Denied Attempts: ${stats.deniedToday}
Authorized Scan Rate: ${stats.approvalRate}%
Peak Traffic Hour: ${peakHour.label} (${peakHour.total} scans)
Active Students in Database: ${stats.studentCount}
Active Faculty in Database: ${stats.facultyCount}
Active Vehicles in Database: ${stats.vehicleCount}
Estimated Present on Campus: ${stats.insideCount}`;

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
                period === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                period === 'weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                period === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              This Month
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadStats}
              title="Refresh Analytics"
              className="rounded-xl border border-slate-300 p-2.5 text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 rounded-xl bg-pup-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition"
            >
              <Download className="h-4 w-4" />
              <span>Export Official Report</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Total Scans</div>
            <div className="mt-2 text-2xl font-black text-slate-900">{stats.totalScans}</div>
            <div className="text-[11px] text-emerald-600 font-medium">{stats.approvalRate}% Approval rate</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase text-emerald-700">Inbound Entries</div>
            <div className="mt-2 text-2xl font-black text-emerald-950">{stats.entriesToday}</div>
            <div className="text-[11px] text-slate-400">Main Entrance Barrier</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase text-rose-700">Outbound Exits</div>
            <div className="mt-2 text-2xl font-black text-rose-950">{stats.exitsToday}</div>
            <div className="text-[11px] text-slate-400">Main Exit Barrier</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase text-amber-700">Peak Traffic Hour</div>
            <div className="mt-2 text-2xl font-black text-slate-900">{peakHour.label}</div>
            <div className="text-[11px] text-slate-400">
              {peakHour.total > 0 ? `${peakHour.total} scans / hour` : 'No scans recorded'}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Gate Pass Distribution by Hour</h3>
            {stats.totalScans === 0 && (
              <span className="text-xs font-semibold text-slate-400">
                (No scan logs in database for this period)
              </span>
            )}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.hourlyDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
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
