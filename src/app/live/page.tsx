'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Camera, Eye, MoonStar, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ScanApiResponse } from '@/types/database';

export default function LiveScannerPage() {
  const [token, setToken] = useState('RFID-A101');
  const [type, setType] = useState<'rfid' | 'qr'>('rfid');
  const [direction, setDirection] = useState<'entry' | 'exit'>('entry');
  const [gateCode, setGateCode] = useState('GATE-01');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanApiResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setBusy(true);
    setResult(null);
    setErrorMsg('');

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer pup_bataan_gate_device_secret_secure_key_2026',
        },
        body: JSON.stringify({
          credential: token.trim(),
          type,
          gateCode,
          direction,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.reason || data.message || 'Scan rejected');
      }

      setResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Scan error occurred');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout
      title="Live Gate Scanner & RFID Validation Console"
      subtitle="Interactive scanner simulator and turnstile barrier testing interface"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Scanner Controller Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Camera className="h-4 w-4 text-pup-700" />
              <span>Gate Terminal Simulation</span>
            </h3>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              TERMINAL READY
            </span>
          </div>

          {/* Virtual Terminal Screen */}
          <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-6 text-center text-white">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-4 ring-white/5">
              <ShieldCheck className="h-8 w-8 text-emerald-400" />
            </div>
            <div className="text-xl font-black tracking-wide">PUP BATAAN SMART GATE</div>
            <p className="text-xs text-slate-400 mt-1">Please tap your RFID ID or scan QR pass</p>
            <div className="mt-4 inline-block rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 font-mono text-xs text-emerald-300">
              READY FOR SCAN • {gateCode} ({direction.toUpperCase()})
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleScan} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Direction</label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold outline-none"
                >
                  <option value="entry">Inbound Entry</option>
                  <option value="exit">Outbound Exit</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Gate Code</label>
                <select
                  value={gateCode}
                  onChange={(e) => setGateCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold outline-none"
                >
                  <option value="GATE-01">GATE-01 (Main Entrance)</option>
                  <option value="GATE-02">GATE-02 (Main Exit)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Credential Type</label>
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setType('rfid');
                    setToken('RFID-A101');
                  }}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                    type === 'rfid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  RFID Smart Card
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('qr');
                    setToken('QR-PUP-2021-12345');
                  }}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                    type === 'qr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  QR Code / Barcode
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Scanned Token / Card UID
              </label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="e.g. RFID-A101, ABC-1234, 2021-12345"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm outline-none focus:border-pup-700"
              />
            </div>

            {/* Quick Demo Pre-fills */}
            <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
              <span className="text-slate-400">Quick Test:</span>
              <button
                type="button"
                onClick={() => {
                  setToken('RFID-A101');
                  setType('rfid');
                }}
                className="rounded bg-slate-100 px-2 py-0.5 font-bold hover:bg-slate-200"
              >
                Juan Dela Cruz (RFID)
              </button>
              <button
                type="button"
                onClick={() => {
                  setToken('ABC-1234');
                  setType('rfid');
                }}
                className="rounded bg-slate-100 px-2 py-0.5 font-bold hover:bg-slate-200"
              >
                Plate: ABC-1234
              </button>
              <button
                type="button"
                onClick={() => {
                  setToken('UNREGISTERED-UID');
                  setType('rfid');
                }}
                className="rounded bg-red-50 text-red-700 px-2 py-0.5 font-bold hover:bg-red-100"
              >
                Denied Token
              </button>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-pup-700 py-3 text-xs font-bold text-white shadow-sm hover:bg-pup-800 disabled:opacity-50"
            >
              <Eye className="h-4 w-4" />
              <span>{busy ? 'Validating Token...' : 'Simulate Physical Scan'}</span>
            </button>
          </form>
        </div>

        {/* Scan Result Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Barrier Decision & Student Record
          </h3>

          {errorMsg && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <div className="font-bold">Scan Denied or Error</div>
                <div>{errorMsg}</div>
              </div>
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              {/* Decision Banner */}
              <div
                className={`rounded-2xl p-5 text-center text-white shadow-md ${
                  result.allowed ? 'bg-emerald-600' : 'bg-red-600'
                }`}
              >
                <div className="text-2xl font-black tracking-wider">{result.action}</div>
                <div className="text-xs uppercase font-semibold mt-1 opacity-90">
                  {result.allowed ? 'Access Authorized • Barrier Opening' : `Denied: ${result.reason || 'Unauthorized'}`}
                </div>
              </div>

              {/* Student and Vehicle Details */}
              {result.student && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div>
                    <h4 className="text-base font-black text-slate-900">{result.student.fullName}</h4>
                    <p className="text-xs text-slate-500 font-mono">
                      {result.student.studentNumber} • {result.student.course}
                    </p>
                  </div>

                  {result.vehicle && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Registered Vehicle:</span>
                        <span className="font-bold text-slate-800">{result.vehicle.brandModel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">License Plate:</span>
                        <span className="font-mono font-bold text-pup-800">{result.vehicle.plateNumber}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                    <span>Gate: {result.gate?.code}</span>
                    <span>Event ID: {result.deviceEventId}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center text-xs text-slate-400">
              <Camera className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              Waiting for scanned token or card...
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
