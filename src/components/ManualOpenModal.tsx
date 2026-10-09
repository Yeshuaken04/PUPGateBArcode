'use client';

import React, { useState } from 'react';
import { X, SquareActivity, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ManualOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  gates?: Array<{ id: string; gate_code: string; gate_name: string }>;
}

export default function ManualOpenModal({ isOpen, onClose, gates = [] }: ManualOpenModalProps) {
  const [gateId, setGateId] = useState(gates[0]?.id || 'GATE-01');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/gate/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateId: gateId || gates[0]?.id || 'GATE-01',
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger gate open');

      setResult({ success: true, message: 'Barrier opened successfully and audit record created.' });
      setTimeout(() => {
        setReason('');
        setResult(null);
        onClose();
      }, 1800);
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Error communicating with server.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-900">
            <SquareActivity className="h-5 w-5 text-pup-700" />
            <h3 className="text-base font-black">Manual Barrier Override</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              All manual gate overrides are permanently logged with your user identity, timestamp, and audit reason.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Select Gate Barrier
            </label>
            <select
              value={gateId}
              onChange={(e) => setGateId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-pup-700"
            >
              {gates.length > 0 ? (
                gates.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.gate_name} ({g.gate_code})
                  </option>
                ))
              ) : (
                <>
                  <option value="GATE-01">Main Entrance Barrier (GATE-01)</option>
                  <option value="GATE-02">Main Exit Barrier (GATE-02)</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Reason for Override *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Authorized visitor vehicle, emergency access, card reader maintenance..."
              className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-pup-700 placeholder:text-slate-400"
            />
          </div>

          {result && (
            <div
              className={`rounded-xl p-3 text-xs font-semibold flex items-center gap-2 ${
                result.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {result.success ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-red-600" />}
              <span>{result.message}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="flex-1 rounded-xl bg-pup-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition disabled:opacity-50"
            >
              {loading ? 'Opening...' : 'Trigger Open Barrier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
