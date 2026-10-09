'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { SquareActivity, Wifi, WifiOff, ShieldCheck, Clock, Settings, RefreshCw } from 'lucide-react';
import ManualOpenModal from '@/components/ManualOpenModal';

export default function GatesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGate, setSelectedGate] = useState<any>(null);

  const gates = [
    {
      id: 'g1',
      gate_code: 'GATE-01',
      gate_name: 'Main Campus Entrance Barrier',
      location: 'Front Gate Turnstile / Vehicle Boom',
      direction: 'Inbound Entry Only',
      device_id: 'CONTROLLER-01',
      active: true,
      relay_pulse_ms: 800,
      status: 'ONLINE',
      last_seen: 'Just now (12s ago)',
    },
    {
      id: 'g2',
      gate_code: 'GATE-02',
      gate_name: 'Main Campus Exit Barrier',
      location: 'Exit Gate Turnstile / Vehicle Boom',
      direction: 'Outbound Exit Only',
      device_id: 'CONTROLLER-02',
      active: true,
      relay_pulse_ms: 800,
      status: 'ONLINE',
      last_seen: 'Just now (18s ago)',
    },
  ];

  return (
    <DashboardLayout
      title="Hardware Barrier & Gate Controllers"
      subtitle="Monitor physical gate controllers, Raspberry Pi relays, and trigger emergency barrier overrides"
    >
      <div className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          {gates.map((g) => (
            <div
              key={g.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pup-50 text-pup-800">
                    <SquareActivity className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{g.gate_name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{g.gate_code} • {g.direction}</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  ONLINE
                </span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Physical Location:</span>
                  <span className="font-semibold text-slate-800">{g.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Controller Hardware:</span>
                  <span className="font-mono font-bold text-slate-800">{g.device_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Relay Pulse Duration:</span>
                  <span className="font-semibold text-slate-800">{g.relay_pulse_ms} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Controller Ping:</span>
                  <span className="text-emerald-700 font-semibold">{g.last_seen}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGate(g);
                    setModalOpen(true);
                  }}
                  className="w-full rounded-xl bg-pup-700 py-3 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition"
                >
                  Manual Open Barrier
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Offline Fallback Architecture Notice */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Raspberry Pi Local SQLite Sync Architecture</span>
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Each gate barrier controller is backed by an on-site Raspberry Pi running a localized SQLite database.
            Even if campus internet connectivity is temporarily disrupted, scanned authorized RFID cards and QR codes
            will open the gate immediately. All events are buffered in the local SQLite queue and automatically
            synchronized to the cloud Supabase database when connection is restored.
          </p>
        </div>

        <ManualOpenModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          gates={gates}
        />
      </div>
    </DashboardLayout>
  );
}
