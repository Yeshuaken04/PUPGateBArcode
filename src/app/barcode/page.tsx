'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BarcodeRenderer from '@/components/BarcodeRenderer';
import {
  Barcode,
  Printer,
  Search,
  Users,
  Car,
  Download,
  CheckCircle2,
  Sparkles,
  QrCode,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Student, Vehicle } from '@/types/database';

export default function BarcodePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedType, setSelectedType] = useState<'student' | 'vehicle' | 'custom'>('student');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [customValue, setCustomValue] = useState<string>('PUP-2026-0001');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: sData } = await supabase
        .from('students')
        .select('*')
        .order('student_number', { ascending: true });
      if (sData) setStudents(sData);

      const { data: vData } = await supabase
        .from('vehicles')
        .select('*, student:students(*)')
        .order('plate_number', { ascending: true });
      if (vData) setVehicles(vData as any);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Determine current active item & barcode string
  const activeStudent = students.find((s) => s.id === selectedStudentId) || students[0];
  const activeVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];

  const currentBarcodeValue =
    selectedType === 'student'
      ? activeStudent?.student_number || activeStudent?.qr_code || '2021-12345'
      : selectedType === 'vehicle'
      ? activeVehicle?.plate_number || 'ABC-1234'
      : customValue || 'EMPTY-BARCODE';

  const currentTitle =
    selectedType === 'student'
      ? activeStudent
        ? `${activeStudent.first_name} ${activeStudent.last_name}`
        : 'Student Gate Pass'
      : selectedType === 'vehicle'
      ? activeVehicle
        ? `${activeVehicle.brand_model} (${activeVehicle.plate_number})`
        : 'Vehicle Barrier Pass'
      : 'Custom Barcode Token';

  const currentSubtitle =
    selectedType === 'student'
      ? activeStudent
        ? `${activeStudent.student_number} • ${activeStudent.course || activeStudent.person_type.toUpperCase()}`
        : 'Select student'
      : selectedType === 'vehicle'
      ? activeVehicle
        ? `Owner: ${activeVehicle.student?.first_name || ''} ${activeVehicle.student?.last_name || ''} (${activeVehicle.vehicle_type})`
        : 'Select vehicle'
      : 'User Defined Barcode Value';

  return (
    <DashboardLayout
      title="Barcode Pass Generator & Management"
      subtitle="Gumawa, sumuri, at mag-print ng opisyal na 1D Code 128 barcodes para sa student IDs at vehicle gate stickers"
    >
      <div className="space-y-6">
        {/* Type Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setSelectedType('student')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                selectedType === 'student'
                  ? 'bg-white text-pup-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Student ID Barcodes ({students.length})</span>
            </button>
            <button
              onClick={() => setSelectedType('vehicle')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                selectedType === 'vehicle'
                  ? 'bg-white text-pup-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Car className="h-4 w-4" />
              <span>Vehicle Stickers ({vehicles.length})</span>
            </button>
            <button
              onClick={() => setSelectedType('custom')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                selectedType === 'custom'
                  ? 'bg-white text-pup-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Barcode className="h-4 w-4" />
              <span>Custom Generator</span>
            </button>
          </div>

          <button
            onClick={loadData}
            title="Refresh database records"
            className="rounded-xl border border-slate-300 p-2.5 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Generator & Preview Grid */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">
                  {selectedType === 'student'
                    ? 'Pumili ng Estudyante'
                    : selectedType === 'vehicle'
                    ? 'Pumili ng Rehistradong Sasakyan'
                    : 'I-type ang Barcode Value'}
                </h3>
                <span className="rounded-md bg-pup-100 px-2 py-0.5 text-[10px] font-bold text-pup-800">
                  CODE 128
                </span>
              </div>

              {selectedType === 'student' && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    Student / Personnel Masterlist
                  </label>
                  {students.length > 0 ? (
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-pup-700"
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.student_number} — {s.first_name} {s.last_name} ({s.course || s.person_type})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
                      Wala pang estudyanteng nakarehistro. Mag-upload gamit ang Excel sa Student Directory.
                    </div>
                  )}
                </div>
              )}

              {selectedType === 'vehicle' && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    Rehistradong Plaka ng Sasakyan
                  </label>
                  {vehicles.length > 0 ? (
                    <select
                      value={selectedVehicleId}
                      onChange={(e) => setSelectedVehicleId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-pup-700 font-mono"
                    >
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.plate_number} — {v.brand_model} ({v.student?.first_name || ''} {v.student?.last_name || ''})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
                      Wala pang sasakyang nakarehistro sa database.
                    </div>
                  )}
                </div>
              )}

              {selectedType === 'custom' && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    Custom Barcode Code / Token
                  </label>
                  <input
                    type="text"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value.toUpperCase())}
                    placeholder="Hal. 2026-PUP-001 o ABC-1234"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-mono font-bold uppercase outline-none focus:border-pup-700"
                  />
                  <p className="text-[11px] text-slate-500">
                    Maaari kang mag-type ng kahit anong numero o alphanumeric token para agad itong maging visual barcode.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={() => window.print()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-pup-700 py-3 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>I-print ang Barcode Pass (Print / PDF)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Visual Barcode Card Preview */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 shadow-sm flex flex-col items-center justify-center">
              <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Live Printable Pass Preview
              </div>

              {/* Printable Pass Card with PUP Branding */}
              <div
                id="printable-barcode-pass"
                className="w-full max-w-md rounded-2xl border-2 border-pup-800 bg-white p-6 shadow-xl text-center space-y-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-3">
                    <img src="/logo200.svg" alt="PUP" className="h-10 w-10 object-contain" />
                    <div className="text-left">
                      <div className="text-xs font-black tracking-wider text-pup-900">
                        POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
                      </div>
                      <div className="text-[10px] font-bold text-amber-600">
                        BATAAN BRANCH • AUTOMATED GATE PASS
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                    VERIFIED
                  </span>
                </div>

                {/* Person / Vehicle Info */}
                <div>
                  <h4 className="text-base font-black text-slate-900">{currentTitle}</h4>
                  <p className="text-xs text-slate-500 font-medium">{currentSubtitle}</p>
                </div>

                {/* THE ACTUAL REAL VISUAL BARCODE STRIPES */}
                <div className="py-2">
                  <BarcodeRenderer
                    value={currentBarcodeValue}
                    height={95}
                    width={2.2}
                    fontSize={14}
                  />
                </div>

                {/* Footer security badge */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400">
                  <div className="flex items-center gap-1 text-slate-600 font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Official Gate Scanner Compatible</span>
                  </div>
                  <span>Valid: S.Y. 2026–2027</span>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-500 text-center max-w-sm">
                I-scan ito gamit ang camera o handheld barcode scanner sa barrier para awtomatikong mabuksan ang gate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
