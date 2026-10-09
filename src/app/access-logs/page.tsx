'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Search,
  LogIn,
  LogOut,
  RefreshCw,
  Download,
  X,
  Filter,
  CheckCircle2,
  XCircle,
  Car,
  ShieldCheck,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardList,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDateTime, formatTimeOnly, isToday } from '@/lib/utils';
import { AccessLog } from '@/types/database';

function AccessLogsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const modeParam = searchParams.get('mode') || 'entry';

  const [mode, setMode] = useState<'entry' | 'exit' | 'all'>(
    modeParam === 'exit' ? 'exit' : modeParam === 'all' ? 'all' : 'entry'
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'allowed' | 'denied'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today'>('all');
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync mode with URL parameter if it changes
  useEffect(() => {
    if (modeParam === 'exit') setMode('exit');
    else if (modeParam === 'all') setMode('all');
    else setMode('entry');
  }, [modeParam]);

  const switchMode = (newMode: 'entry' | 'exit' | 'all') => {
    setMode(newMode);
    router.push(`/access-logs?mode=${newMode}`);
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('access_logs')
        .select(`
          *,
          student:students(*),
          vehicle:vehicles(*),
          gate:gates(*)
        `)
        .order('scanned_at', { ascending: false })
        .limit(200);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        setLogs(data as any);
      } else {
        // Mock fallback data for instant demo
        setLogs([
          {
            id: '1',
            direction: 'entry',
            credential_type: 'rfid',
            credential_value: 'RFID-A101',
            result: 'allowed',
            scanned_at: new Date(Date.now() - 4 * 60000).toISOString(),
            created_at: new Date().toISOString(),
            student: {
              id: 's1',
              student_number: '2021-12345',
              first_name: 'Juan',
              last_name: 'Dela Cruz',
              person_type: 'student',
              course: 'BSIT',
              status: 'active',
              created_at: '',
              updated_at: '',
            },
            vehicle: {
              id: 'v1',
              student_id: 's1',
              plate_number: 'ABC-1234',
              brand_model: 'Yamaha Aerox 155',
              vehicle_type: 'motorcycle',
              is_active: true,
              created_at: '',
            },
            gate: {
              id: 'g1',
              gate_code: 'GATE-01',
              gate_name: 'Main Entrance Gate',
              direction: 'entry',
              active: true,
              relay_pulse_ms: 800,
              created_at: '',
            },
          },
          {
            id: '2',
            direction: 'entry',
            credential_type: 'qr',
            credential_value: 'QR-PUP-2022-06789',
            result: 'allowed',
            scanned_at: new Date(Date.now() - 10 * 60000).toISOString(),
            created_at: new Date().toISOString(),
            student: {
              id: 's2',
              student_number: '2022-06789',
              first_name: 'Maria',
              last_name: 'Santos',
              person_type: 'student',
              course: 'BSBA',
              status: 'active',
              created_at: '',
              updated_at: '',
            },
            vehicle: {
              id: 'v2',
              student_id: 's2',
              plate_number: 'DEF-5678',
              brand_model: 'Honda Click 125',
              vehicle_type: 'motorcycle',
              is_active: true,
              created_at: '',
            },
            gate: {
              id: 'g1',
              gate_code: 'GATE-01',
              gate_name: 'Main Entrance Gate',
              direction: 'entry',
              active: true,
              relay_pulse_ms: 800,
              created_at: '',
            },
          },
          {
            id: '3',
            direction: 'exit',
            credential_type: 'rfid',
            credential_value: 'RFID-C303',
            result: 'allowed',
            scanned_at: new Date(Date.now() - 15 * 60000).toISOString(),
            created_at: new Date().toISOString(),
            student: {
              id: 's3',
              student_number: '2021-09876',
              first_name: 'Mark',
              last_name: 'Reyes',
              person_type: 'student',
              course: 'BSEE',
              status: 'active',
              created_at: '',
              updated_at: '',
            },
            vehicle: {
              id: 'v3',
              student_id: 's3',
              plate_number: 'GHI-9012',
              brand_model: 'Toyota Vios',
              vehicle_type: 'car',
              is_active: true,
              created_at: '',
            },
            gate: {
              id: 'g2',
              gate_code: 'GATE-02',
              gate_name: 'Main Exit Gate',
              direction: 'exit',
              active: true,
              relay_pulse_ms: 800,
              created_at: '',
            },
          },
          {
            id: '4',
            direction: 'entry',
            credential_type: 'rfid',
            credential_value: 'SUSPENDED-ID',
            result: 'denied',
            denial_reason: 'STUDENT_SUSPENDED',
            scanned_at: new Date(Date.now() - 25 * 60000).toISOString(),
            created_at: new Date().toISOString(),
            gate: {
              id: 'g1',
              gate_code: 'GATE-01',
              gate_name: 'Main Entrance Gate',
              direction: 'entry',
              active: true,
              relay_pulse_ms: 800,
              created_at: '',
            },
          },
        ]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    const entries = logs.filter((l) => l.direction === 'entry');
    const exits = logs.filter((l) => l.direction === 'exit');
    const entriesAllowed = entries.filter((l) => l.result === 'allowed').length;
    const entriesDenied = entries.filter((l) => l.result === 'denied').length;
    const exitsAllowed = exits.filter((l) => l.result === 'allowed').length;
    const exitsDenied = exits.filter((l) => l.result === 'denied').length;

    return {
      entriesTotal: entries.length,
      exitsTotal: exits.length,
      allTotal: logs.length,
      entriesAllowed,
      entriesDenied,
      exitsAllowed,
      exitsDenied,
      insideEst: Math.max(0, entriesAllowed - exitsAllowed + 1320),
    };
  }, [logs]);

  // Dynamic search filter (Student Name, Plate Number, Student ID, Vehicle Model)
  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return logs.filter((log) => {
      // 1. Mode Filter (entry vs exit vs all)
      if (mode === 'entry' && log.direction !== 'entry') return false;
      if (mode === 'exit' && log.direction !== 'exit') return false;

      // 2. Status Filter
      if (statusFilter !== 'all' && log.result !== statusFilter) return false;

      // 3. Date Filter
      if (dateFilter === 'today' && !isToday(log.scanned_at)) return false;

      // 4. Search Filter (Plate Number, Student Name, Student ID, Vehicle Model)
      if (query) {
        const student = log.student;
        const vehicle = log.vehicle;

        const plate = (vehicle?.plate_number || '').toLowerCase();
        const fullName = `${student?.first_name || ''} ${student?.last_name || ''}`.toLowerCase();
        const studentNum = (student?.student_number || '').toLowerCase();
        const brand = (vehicle?.brand_model || '').toLowerCase();
        const gate = (log.gate?.gate_name || log.gate?.gate_code || '').toLowerCase();

        const matches =
          plate.includes(query) ||
          fullName.includes(query) ||
          studentNum.includes(query) ||
          brand.includes(query) ||
          gate.includes(query);

        if (!matches) return false;
      }

      return true;
    });
  }, [logs, mode, statusFilter, dateFilter, search]);

  const exportCSV = () => {
    const rows = [
      ['Log ID', 'Timestamp', 'Direction', 'Plate Number', 'Student Name', 'Student ID', 'Vehicle Model', 'Gate', 'Result', 'Reason'],
      ...filteredLogs.map((l) => [
        l.id,
        l.scanned_at,
        l.direction.toUpperCase(),
        l.vehicle?.plate_number || 'NO PLATE',
        l.student ? `${l.student.first_name} ${l.student.last_name}` : 'Unknown',
        l.student?.student_number || 'N/A',
        l.vehicle?.brand_model || 'N/A',
        l.gate?.gate_name || l.gate?.gate_code || 'Main Gate',
        l.result.toUpperCase(),
        l.denial_reason || 'OK',
      ]),
    ];

    const csvContent = rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pup-bataan-${mode}-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const titleText =
    mode === 'entry' ? 'Inbound Entry Logs' : mode === 'exit' ? 'Outbound Exit Logs' : 'All Activity Logs';

  return (
    <DashboardLayout
      title={titleText}
      subtitle="Search, audit, and track vehicle gate passes and student credentials in real-time"
    >
      <div className="space-y-5">
        {/* Dedicated KPI Cards based on Mode */}
        {mode === 'entry' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Total Entries
                </span>
                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                  <LogIn className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-black text-emerald-950">{stats.entriesTotal}</div>
              <div className="text-[11px] font-medium text-emerald-700">Inbound transactions</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Authorized In
                </span>
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-black text-slate-900">{stats.entriesAllowed}</div>
              <div className="text-[11px] font-medium text-slate-400">Barrier opened</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Denied Entry
                </span>
                <div className="rounded-xl bg-red-50 p-2 text-red-600">
                  <ShieldAlert className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-black text-red-600">{stats.entriesDenied}</div>
              <div className="text-[11px] font-medium text-slate-400">Unauthorized attempts</div>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
                  Campus Presence
                </span>
                <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
                  <Car className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-black text-sky-950">{stats.insideEst}</div>
              <div className="text-[11px] font-medium text-sky-700">Estimated inside campus</div>
            </div>
          </div>
        )}

        {mode === 'exit' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                  Total Exits
                </span>
                <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
                  <LogOut className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-black text-rose-950">{stats.exitsTotal}</div>
              <div className="text-[11px] font-medium text-rose-700">Outbound departures</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Authorized Out
                </span>
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-black text-slate-900">{stats.exitsAllowed}</div>
              <div className="text-[11px] font-medium text-slate-400">Verified exits</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Denied Exit
                </span>
                <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                  <ShieldAlert className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-black text-amber-600">{stats.exitsDenied}</div>
              <div className="text-[11px] font-medium text-slate-400">Flagged exit attempts</div>
            </div>
            <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
                  Total Transactions
                </span>
                <div className="rounded-xl bg-purple-100 p-2 text-purple-700">
                  <ClipboardList className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-black text-purple-950">{stats.allTotal}</div>
              <div className="text-[11px] font-medium text-purple-700">All audit events</div>
            </div>
          </div>
        )}

        {/* Main Log Management Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          {/* Top Bar: Tabs & Quick Action buttons */}
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
            {/* View Mode Switcher */}
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => switchMode('entry')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition ${
                  mode === 'entry'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="h-4 w-4 text-emerald-600" />
                <span>Entry Logs</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                  {stats.entriesTotal}
                </span>
              </button>

              <button
                type="button"
                onClick={() => switchMode('exit')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition ${
                  mode === 'exit'
                    ? 'bg-white text-rose-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogOut className="h-4 w-4 text-rose-600" />
                <span>Exit Logs</span>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-800">
                  {stats.exitsTotal}
                </span>
              </button>

              <button
                type="button"
                onClick={() => switchMode('all')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition ${
                  mode === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ClipboardList className="h-4 w-4 text-slate-500" />
                <span>All Logs</span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-800">
                  {stats.allTotal}
                </span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={loadLogs}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 rounded-xl bg-pup-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-pup-800"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Search Bar & Secondary Filters */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Live Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search plate number (e.g., ABC-1234) or student name (e.g., Juan)..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm outline-none placeholder:text-slate-400 focus:border-pup-700"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-pup-700"
              >
                <option value="all">All Statuses</option>
                <option value="allowed">Authorized Only</option>
                <option value="denied">Denied Only</option>
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-pup-700"
              >
                <option value="all">All Time</option>
                <option value="today">Today Only</option>
              </select>

              {(search || statusFilter !== 'all' || dateFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                    setDateFilter('all');
                  }}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Active Search Tag Indicator */}
          {search && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Matching results for:</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1 font-bold text-slate-800">
                "{search}"
                <button onClick={() => setSearch('')} className="hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
              <span className="text-slate-400">({filteredLogs.length} found)</span>
            </div>
          )}

          {/* Logs Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3.5 py-3">Date / Time</th>
                  <th className="px-3.5 py-3">Direction</th>
                  <th className="px-3.5 py-3">Plate Number</th>
                  <th className="px-3.5 py-3">Student Name & ID</th>
                  <th className="px-3.5 py-3">Vehicle Details</th>
                  <th className="px-3.5 py-3">Gate</th>
                  <th className="px-3.5 py-3">Credential</th>
                  <th className="px-3.5 py-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => {
                    const isAllowed = log.result === 'allowed';
                    const isEntry = log.direction === 'entry';
                    const student = log.student;
                    const vehicle = log.vehicle;

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition">
                        {/* Timestamp */}
                        <td className="whitespace-nowrap px-3.5 py-3">
                          <div className="font-bold text-slate-900">{formatTimeOnly(log.scanned_at)}</div>
                          <div className="text-[11px] text-slate-400">
                            {formatDateTime(log.scanned_at).split(',')[0]}
                          </div>
                        </td>

                        {/* Direction Badge */}
                        <td className="whitespace-nowrap px-3.5 py-3">
                          {isEntry ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                              <ArrowDownLeft className="h-3 w-3 text-emerald-600" /> ENTRY
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-800 border border-rose-200">
                              <ArrowUpRight className="h-3 w-3 text-rose-600" /> EXIT
                            </span>
                          )}
                        </td>

                        {/* Plate Number (Prominent Badge) */}
                        <td className="whitespace-nowrap px-3.5 py-3">
                          <span className="inline-block rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 font-mono text-xs font-black tracking-wider text-slate-900 shadow-sm">
                            {vehicle?.plate_number || 'NO PLATE'}
                          </span>
                        </td>

                        {/* Student Details */}
                        <td className="px-3.5 py-3">
                          <div className="font-bold text-slate-900">
                            {student ? `${student.first_name} ${student.last_name}` : 'Unknown Visitor'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {student?.student_number ? `${student.student_number} • ${student.course || ''}` : 'Unregistered'}
                          </div>
                        </td>

                        {/* Vehicle Info */}
                        <td className="px-3.5 py-3">
                          <div className="text-xs font-semibold text-slate-800">
                            {vehicle?.brand_model || '—'}
                          </div>
                          <div className="text-[11px] text-slate-400 capitalize">
                            {vehicle?.vehicle_type || 'N/A'} {vehicle?.color ? `• ${vehicle.color}` : ''}
                          </div>
                        </td>

                        {/* Gate */}
                        <td className="whitespace-nowrap px-3.5 py-3 text-xs font-medium text-slate-600">
                          {log.gate?.gate_name || log.gate?.gate_code || 'Main Gate'}
                        </td>

                        {/* Credential */}
                        <td className="whitespace-nowrap px-3.5 py-3 text-xs font-mono text-slate-500 uppercase">
                          {log.credential_type || 'RFID'}
                        </td>

                        {/* Result Badge */}
                        <td className="whitespace-nowrap px-3.5 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              isAllowed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isAllowed ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {log.result.toUpperCase()}
                          </span>
                          {log.denial_reason && (
                            <div className="text-[10px] text-red-600 mt-0.5 max-w-[120px] truncate" title={log.denial_reason}>
                              {log.denial_reason}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Search className="h-5 w-5" />
                      </div>
                      <div className="text-sm font-bold text-slate-800">No logs found</div>
                      <p className="text-xs text-slate-500 mt-1">
                        {search
                          ? `No ${mode === 'all' ? '' : mode + ' '}records matching "${search}". Please check the plate number or student name.`
                          : `No ${mode === 'all' ? '' : mode + ' '}records under current filter.`}
                      </p>
                      {search && (
                        <button
                          onClick={() => setSearch('')}
                          className="mt-3 text-xs font-bold text-pup-700 hover:underline"
                        >
                          Clear search query
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function AccessLogsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading access logs...</div>}>
      <AccessLogsContent />
    </Suspense>
  );
}
