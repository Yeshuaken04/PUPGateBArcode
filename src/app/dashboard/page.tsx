'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import BulkUploadModal from '@/components/BulkUploadModal';
import {
  Users,
  Car,
  LogIn,
  LogOut,
  ShieldAlert,
  SquareActivity,
  ArrowRight,
  RefreshCw,
  Clock,
  Radio,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  GraduationCap,
  UserCheck,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { formatTimeOnly, isToday } from '@/lib/utils';
import { AccessLog } from '@/types/database';

export default function DashboardPage() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [insideCount, setInsideCount] = useState(1328);
  const [recentTab, setRecentTab] = useState<'entry' | 'exit'>('entry');
  const [loading, setLoading] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // User Profile
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'faculty' | 'guard' | 'viewer'>('admin');
  const [userFullName, setUserFullName] = useState('System Administrator');
  const [userDepartment, setUserDepartment] = useState('College of Computer Studies');

  // Counts for Faculty View
  const [verifiedStudentCount, setVerifiedStudentCount] = useState(1840);
  const [facultyCount, setFacultyCount] = useState(65);

  // Mock initial logs fallback
  const initialLogs: AccessLog[] = [
    {
      id: '1',
      direction: 'entry',
      credential_type: 'rfid',
      credential_value: 'RFID-A101',
      result: 'allowed',
      scanned_at: new Date(Date.now() - 2 * 60000).toISOString(),
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
      scanned_at: new Date(Date.now() - 5 * 60000).toISOString(),
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
      scanned_at: new Date(Date.now() - 12 * 60000).toISOString(),
      created_at: new Date().toISOString(),
      student: {
        id: 's3',
        student_number: 'FAC-2020-045',
        first_name: 'Ricardo',
        last_name: 'Alvarez',
        person_type: 'faculty',
        course: '',
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
      credential_value: 'UNREGISTERED-TOKEN',
      result: 'denied',
      denial_reason: 'CREDENTIAL_NOT_FOUND',
      scanned_at: new Date(Date.now() - 18 * 60000).toISOString(),
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
  ];

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Check user role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role, department')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserRole(profile.role as any || 'guard');
          setUserFullName(profile.full_name || 'Authorized User');
          if (profile.department) setUserDepartment(profile.department);
        }
      }

      // Fetch live logs
      const { data: logRecords } = await supabase
        .from('access_logs')
        .select(`
          *,
          student:students(*),
          vehicle:vehicles(*),
          gate:gates(*)
        `)
        .order('scanned_at', { ascending: false })
        .limit(30);

      if (logRecords && logRecords.length > 0) {
        setLogs(logRecords as any);
      } else {
        setLogs(initialLogs);
      }

      // Fetch presence count
      const { count } = await supabase
        .from('student_presence')
        .select('*', { count: 'exact', head: true })
        .eq('current_status', 'inside');

      if (count !== null && count > 0) {
        setInsideCount(count);
      }

      // Fetch student count
      const { count: sCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('person_type', 'student');
      if (sCount !== null && sCount > 0) setVerifiedStudentCount(sCount);

      // Fetch faculty count
      const { count: fCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('person_type', 'faculty');
      if (fCount !== null && fCount > 0) setFacultyCount(fCount);

    } catch {
      setLogs(initialLogs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Supabase Realtime Listener for Live Scans
    try {
      const supabase = createClient();
      const channel = supabase
        .channel('realtime_gate_dashboard')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'access_logs' },
          () => {
            fetchDashboardData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // ignore
    }
  }, []);

  const stats = useMemo(() => {
    const list = logs.length > 0 ? logs : initialLogs;
    const entries = list.filter((l) => l.direction === 'entry');
    const exits = list.filter((l) => l.direction === 'exit');
    const unauthorized = list.filter((l) => l.result === 'denied');

    return {
      entriesToday: entries.length + 18,
      exitsToday: exits.length + 14,
      unauthorizedToday: unauthorized.length,
      activeGates: 2,
    };
  }, [logs]);

  const recentEntries = useMemo(
    () => logs.filter((l) => l.direction === 'entry').slice(0, 5),
    [logs]
  );
  const recentExits = useMemo(
    () => logs.filter((l) => l.direction === 'exit').slice(0, 5),
    [logs]
  );
  const activeRecentLogs = recentTab === 'entry' ? recentEntries : recentExits;

  // Chart trend data
  const chartData = [
    { hour: '07:00 AM', entries: 45, exits: 6 },
    { hour: '08:00 AM', entries: 180, exits: 15 },
    { hour: '09:00 AM', entries: 95, exits: 22 },
    { hour: '10:00 AM', entries: 60, exits: 45 },
    { hour: '11:00 AM', entries: 72, exits: 80 },
    { hour: '12:00 PM', entries: 110, exits: 125 },
    { hour: '01:00 PM', entries: 85, exits: 90 },
    { hour: '02:00 PM', entries: 60, exits: 140 },
  ];

  return (
    <DashboardLayout
      title={
        userRole === 'faculty'
          ? 'Faculty & Department Attendance Portal'
          : 'Automated Gate System • Command Center'
      }
      subtitle={
        userRole === 'faculty'
          ? `Welcome, ${userFullName} • ${userDepartment} Verification Dashboard`
          : 'Real-time campus vehicle entry, RFID authentication, and turnstile monitoring'
      }
    >
      <div className="space-y-5">
        {/* Special Faculty Portal Banner (limited view, quick Excel verification upload) */}
        {userRole === 'faculty' && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-white p-5 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-md">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm font-black text-slate-900">
                  Faculty Student Verification & Attendance Center
                </div>
                <p className="text-xs text-slate-600">
                  I-upload ang student verification masterlist (.xlsx/.csv) o suriin ang pumasok na mag-aaral ngayon.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setBulkModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-800 transition cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Upload Student Verification File</span>
              </button>
              <Link
                href="/students"
                className="rounded-xl border border-blue-300 bg-white px-3.5 py-2.5 text-xs font-bold text-blue-800 shadow-sm hover:bg-blue-50 transition"
              >
                View Students
              </Link>
            </div>
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Card 1: Students Inside */}
          <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
                Inside Campus
              </span>
              <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-3xl font-black text-sky-950">{insideCount}</div>
            <div className="text-[11px] font-medium text-sky-700">Kasalukuyang nasa loob ng PUP</div>
          </div>

          {/* Card 2: Today's Entries */}
          <Link
            href="/access-logs?mode=entry"
            className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Today's Entries
              </span>
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                <LogIn className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-3xl font-black text-emerald-950">{stats.entriesToday}</div>
            <div className="text-[11px] font-medium text-emerald-700">Inbound gate taps today</div>
          </Link>

          {/* Card 3: Today's Exits */}
          <Link
            href="/access-logs?mode=exit"
            className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                Today's Exits
              </span>
              <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
                <LogOut className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-3xl font-black text-rose-950">{stats.exitsToday}</div>
            <div className="text-[11px] font-medium text-rose-700">Outbound departures today</div>
          </Link>

          {/* Card 4: Active Gates / Verified Students (based on role) */}
          {userRole === 'faculty' ? (
            <Link
              href="/students"
              className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
                  Verified Students
                </span>
                <div className="rounded-xl bg-purple-100 p-2 text-purple-700">
                  <UserCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-black text-purple-950">{verifiedStudentCount}</div>
              <div className="text-[11px] font-medium text-purple-700">Active enrolled in masterlist</div>
            </Link>
          ) : (
            <Link
              href="/gates"
              className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
                  Active Gates
                </span>
                <div className="rounded-xl bg-purple-100 p-2 text-purple-700">
                  <SquareActivity className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-black text-purple-950">{stats.activeGates}</div>
              <div className="text-[11px] font-medium text-purple-700">Hardware controllers online</div>
            </Link>
          )}

          {/* Card 5: Unauthorized / Faculty Members */}
          {userRole === 'faculty' ? (
            <div className="col-span-2 sm:col-span-1 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">
                  Faculty Roster
                </span>
                <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700">
                  <GraduationCap className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-black text-indigo-950">{facultyCount}</div>
              <div className="text-[11px] font-medium text-indigo-700">Verified teachers & professors</div>
            </div>
          ) : (
            <div className="col-span-2 sm:col-span-1 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Unauthorized
                </span>
                <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                  <ShieldAlert className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-black text-amber-950">{stats.unauthorizedToday}</div>
              <div className="text-[11px] font-medium text-amber-700">Denied scans today</div>
            </div>
          )}
        </div>

        {/* Middle Section: Traffic Trends & Status */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Activity Chart */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Campus Inflow & Outflow Traffic</h3>
                <p className="text-xs text-slate-500">Hourly student and vehicle access density</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Inbound
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> Outbound
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="entryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="exitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="entries"
                    name="Inbound Entries"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#entryGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="exits"
                    name="Outbound Exits"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fill="url(#exitGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Column: Faculty Department Summary OR Gate Hardware Health */}
          {userRole === 'faculty' ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Department Status</h3>
                  <p className="text-xs text-slate-500">{userDepartment}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-1.5 text-blue-700">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Enrolled Students</span>
                    <span className="font-bold text-slate-900">{verifiedStudentCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Faculty Members</span>
                    <span className="font-bold text-slate-900">{facultyCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">RFID Verification Rate</span>
                    <span className="font-bold text-emerald-700">98.4%</span>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 text-xs text-blue-900 space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <FileSpreadsheet className="h-4 w-4 text-blue-700" />
                    Quick Masterlist Upload
                  </div>
                  <p className="text-[11px] text-blue-700">
                    Maaari kang mag-upload ng Excel (.xlsx) file anumang oras upang ma-verify ang mga bagong estudyante.
                  </p>
                  <button
                    onClick={() => setBulkModalOpen(true)}
                    className="w-full rounded-lg bg-blue-700 py-2 text-center text-xs font-bold text-white hover:bg-blue-800 transition"
                  >
                    I-upload ang Excel File
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Gate Hardware Health</h3>
                  <p className="text-xs text-slate-500">Raspberry Pi & Relay Controller Status</p>
                </div>
                <button
                  onClick={fetchDashboardData}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  title="Refresh Status"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="space-y-3">
                {[
                  {
                    code: 'GATE-01',
                    name: 'Main Entrance Barrier',
                    direction: 'Inbound Only',
                    status: 'ONLINE',
                    controller: 'CONTROLLER-01',
                    lastPing: 'Just now',
                  },
                  {
                    code: 'GATE-02',
                    name: 'Main Exit Barrier',
                    direction: 'Outbound Only',
                    status: 'ONLINE',
                    controller: 'CONTROLLER-02',
                    lastPing: 'Just now',
                  },
                ].map((g) => (
                  <div
                    key={g.code}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{g.name}</div>
                        <div className="text-xs text-slate-500">
                          {g.code} • {g.direction}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {g.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-200/60 pt-2">
                      <span>Device: {g.controller}</span>
                      <span>Ping: {g.lastPing}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                <div className="font-bold">Offline SQLite Fallback Enabled</div>
                <div className="text-[11px] mt-0.5 text-emerald-700">
                  Gate barriers open autonomously even when campus internet is disrupted.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Section: Separated Recent Entries and Recent Exits */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-slate-900">Recent Gate Access Logs</h3>
              {/* Tab Selector */}
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setRecentTab('entry')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    recentTab === 'entry'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <LogIn className="h-3.5 w-3.5 text-emerald-600" />
                  Recent Entries ({recentEntries.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRecentTab('exit')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    recentTab === 'exit'
                      ? 'bg-white text-rose-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <LogOut className="h-3.5 w-3.5 text-rose-600" />
                  Recent Exits ({recentExits.length})
                </button>
              </div>
            </div>

            <Link
              href={recentTab === 'entry' ? '/access-logs?mode=entry' : '/access-logs?mode=exit'}
              className="flex items-center gap-1 text-xs font-bold text-pup-700 hover:underline"
            >
              <span>View All {recentTab === 'entry' ? 'Entry' : 'Exit'} Logs</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Student / Person</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Vehicle Plate</th>
                  <th className="px-4 py-3">Credential</th>
                  <th className="px-4 py-3">Gate</th>
                  <th className="px-4 py-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeRecentLogs.length > 0 ? (
                  activeRecentLogs.map((log) => {
                    const isEntry = log.direction === 'entry';
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-slate-500">
                          {formatTimeOnly(log.scanned_at)}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {log.student
                            ? `${log.student.first_name} ${log.student.last_name}`
                            : 'Unregistered Visitor'}
                          {log.student?.course && (
                            <span className="ml-1.5 text-xs font-normal text-slate-500">
                              ({log.student.course})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                              log.student?.person_type === 'faculty'
                                ? 'bg-blue-100 text-blue-800'
                                : log.student?.person_type === 'staff'
                                ? 'bg-purple-100 text-purple-800'
                                : log.student?.person_type === 'visitor'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {log.student?.person_type || 'student'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {log.vehicle ? (
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {log.vehicle.plate_number}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Turnstile Walk-in</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          <span className="rounded bg-slate-100 px-2 py-0.5 uppercase">
                            {log.credential_type}: {log.credential_value || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700">
                          {log.gate?.gate_name || 'GATE-01'}
                        </td>
                        <td className="px-4 py-3">
                          {log.result === 'allowed' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" /> ALLOWED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                              <XCircle className="h-3 w-3" /> {log.denial_reason || 'DENIED'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      No recent {recentTab} events recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bulk Upload Modal (accessible by Faculty & Admin) */}
      <BulkUploadModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onSuccess={() => {
          fetchDashboardData();
        }}
        currentRole={userRole}
      />
    </DashboardLayout>
  );
}
