'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ShieldCheck,
  RefreshCw,
  Filter,
  Layers,
  FileSpreadsheet,
  FileText,
  X,
  CreditCard,
} from 'lucide-react';
import { Student, Vehicle } from '@/types/database';

export default function BarcodePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedType, setSelectedType] = useState<'student' | 'vehicle' | 'custom'>('student');
  const [loading, setLoading] = useState(false);

  // Filters for Students
  const [courseFilter, setCourseFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected entities for single pass preview
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [customValue, setCustomValue] = useState<string>('PUP-2026-0001');

  // Bulk Modal State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [printTarget, setPrintTarget] = useState<'single' | 'bulk' | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, vRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/vehicles'),
      ]);
      const [sJson, vJson] = await Promise.all([
        sRes.json(),
        vRes.json(),
      ]);

      if (sRes.ok && sJson.data) {
        setStudents(sJson.data);
      } else {
        setStudents([]);
      }

      if (vRes.ok && vJson.data) {
        setVehicles(vJson.data);
      } else {
        setVehicles([]);
      }
    } catch {
      setStudents([]);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute available courses and sections from live data
  const availableCourses = useMemo(() => {
    const list = new Set<string>();
    // Pre-seed common PUP courses
    ['BSIT', 'BSBA', 'BSEE', 'BSCE', 'BSED', 'DOMT'].forEach((c) => list.add(c));
    students.forEach((s) => {
      if (s.course && s.course.trim()) list.add(s.course.trim().toUpperCase());
    });
    return Array.from(list).sort();
  }, [students]);

  const availableSections = useMemo(() => {
    const list = new Set<string>();
    ['A', 'B', 'C', 'D', '1', '2'].forEach((sec) => list.add(sec));
    students.forEach((s) => {
      if (s.section && s.section.trim()) list.add(s.section.trim().toUpperCase());
    });
    return Array.from(list).sort();
  }, [students]);

  // Filtered Students list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (courseFilter !== 'all' && (s.course || '').toUpperCase() !== courseFilter.toUpperCase()) {
        return false;
      }
      if (yearFilter !== 'all' && String(s.year_level || '') !== yearFilter) {
        return false;
      }
      if (sectionFilter !== 'all' && (s.section || '').toUpperCase() !== sectionFilter.toUpperCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
        const num = s.student_number.toLowerCase();
        const crs = (s.course || '').toLowerCase();
        if (!fullName.includes(q) && !num.includes(q) && !crs.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [students, courseFilter, yearFilter, sectionFilter, searchQuery]);

  // Sync selectedStudentId when filtered list changes
  useEffect(() => {
    if (filteredStudents.length > 0) {
      if (!selectedStudentId || !filteredStudents.some((s) => s.id === selectedStudentId)) {
        setSelectedStudentId(filteredStudents[0].id);
      }
    } else {
      setSelectedStudentId('');
    }
  }, [filteredStudents, selectedStudentId]);

  const activeStudent = students.find((s) => s.id === selectedStudentId) || filteredStudents[0];
  const activeVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];

  const currentBarcodeValue =
    selectedType === 'student'
      ? activeStudent?.student_number || activeStudent?.qr_code || '2026-00000'
      : selectedType === 'vehicle'
      ? activeVehicle?.plate_number || 'ABC-1234'
      : customValue || 'EMPTY-BARCODE';

  const currentTitle =
    selectedType === 'student'
      ? activeStudent
        ? `${activeStudent.first_name} ${activeStudent.middle_name ? activeStudent.middle_name + ' ' : ''}${activeStudent.last_name}`
        : 'Student Gate Pass'
      : selectedType === 'vehicle'
      ? activeVehicle
        ? `${activeVehicle.brand_model} (${activeVehicle.plate_number})`
        : 'Vehicle Barrier Pass'
      : 'Custom Barcode Token';

  const currentSubtitle =
    selectedType === 'student'
      ? activeStudent
        ? `${activeStudent.student_number} • ${activeStudent.course || activeStudent.person_type.toUpperCase()} ${
            activeStudent.year_level ? `- Year ${activeStudent.year_level}` : ''
          }${activeStudent.section ? ` Sec ${activeStudent.section}` : ''}`
        : 'Pumili ng estudyante'
      : selectedType === 'vehicle'
      ? activeVehicle
        ? `May-ari: ${activeVehicle.student?.first_name || ''} ${activeVehicle.student?.last_name || ''} (${activeVehicle.vehicle_type})`
        : 'Pumili ng sasakyan'
      : 'User Defined Barcode Value';

  // Chunk array for A4 pages (8 cards per sheet: 2 columns × 4 rows)
  const bulkA4Pages = useMemo(() => {
    const list = filteredStudents;
    const pages: Student[][] = [];
    const pageSize = 8;
    for (let i = 0; i < list.length; i += pageSize) {
      pages.push(list.slice(i, i + pageSize));
    }
    return pages;
  }, [filteredStudents]);

  const handlePrintSingle = () => {
    setPrintTarget('single');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handlePrintBulk = () => {
    setPrintTarget('bulk');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <DashboardLayout
      title="Barcode Pass Generator & Management"
      subtitle="Gumawa, sumuri, at mag-print ng opisyal na 1D Code 128 barcodes para sa student IDs (single o bulk A4 sheet)"
    >
      {/* Print CSS Styles injected inline */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-surface-single,
          #print-surface-single *,
          #print-surface-bulk,
          #print-surface-bulk * {
            visibility: visible !important;
          }
          #print-surface-single {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 85.6mm !important;
            height: 54mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #print-surface-bulk {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          .a4-print-page {
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 8mm !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>

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
            className="rounded-xl border border-slate-300 p-2.5 text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Student Specific Filter Bar */}
        {selectedType === 'student' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                <Filter className="h-4 w-4 text-pup-700" />
                <span>Pumili ng Kurso, Taon (Grade 1-4), at Seksyon</span>
              </div>
              <span className="text-xs font-semibold text-pup-800 bg-pup-50 px-2.5 py-0.5 rounded-full border border-pup-200">
                {filteredStudents.length} estudyante ang tumutugma
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Course */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Kurso / Program
                </label>
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-pup-700"
                >
                  <option value="all">Lahat ng Kurso</option>
                  {availableCourses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Level (Grade 1-4) */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Year Level (Taon)
                </label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-pup-700"
                >
                  <option value="all">Lahat ng Taon (1st-4th)</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>

              {/* Section */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Seksyon (Section)
                </label>
                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-pup-700"
                >
                  <option value="all">Lahat ng Seksyon</option>
                  {availableSections.map((sec) => (
                    <option key={sec} value={sec}>
                      Seksyon {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search text */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Pangalan o Student ID
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Mag-search..."
                    className="w-full rounded-xl border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-pup-700"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generator & Preview Grid */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">
                  {selectedType === 'student'
                    ? 'Piliin ang Estudyante'
                    : selectedType === 'vehicle'
                    ? 'Piliin ang Rehistradong Sasakyan'
                    : 'I-type ang Barcode Value'}
                </h3>
                <span className="rounded-md bg-pup-100 px-2 py-0.5 text-[10px] font-bold text-pup-800">
                  CODE 128
                </span>
              </div>

              {/* Student Picker */}
              {selectedType === 'student' && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    Estudyante para sa Single Pass
                  </label>
                  {filteredStudents.length > 0 ? (
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-pup-700"
                    >
                      {filteredStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.student_number} — {s.first_name} {s.last_name} ({s.course || 'N/A'}{' '}
                          {s.year_level ? `- ${s.year_level}${s.section || ''}` : ''})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
                      Walang estudyanteng tumutugma sa napiling kurso/taon/seksyon. Baguhin ang filter sa itaas.
                    </div>
                  )}

                  {/* Dual Action Buttons: Single and Bulk */}
                  <div className="pt-2 space-y-2">
                    <button
                      onClick={handlePrintSingle}
                      disabled={!activeStudent}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-pup-700 py-3 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition disabled:opacity-50 cursor-pointer"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>I-print ang Single ID Pass (85.6mm × 54mm)</span>
                    </button>

                    <button
                      onClick={() => setBulkModalOpen(true)}
                      disabled={filteredStudents.length === 0}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-pup-800 bg-white py-3 text-xs font-bold text-pup-900 shadow-sm hover:bg-pup-50 transition disabled:opacity-50 cursor-pointer"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-pup-700" />
                      <span>
                        Bulk A4 Bond Paper Print ({filteredStudents.length} Estudyante • {bulkA4Pages.length} Pahina)
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Vehicle Picker */}
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

                  <div className="pt-2">
                    <button
                      onClick={handlePrintSingle}
                      disabled={!activeVehicle}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-pup-700 py-3 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition cursor-pointer"
                    >
                      <Printer className="h-4 w-4" />
                      <span>I-print ang Vehicle Gate Sticker Pass</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Custom Generator */}
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
                  <div className="pt-2">
                    <button
                      onClick={handlePrintSingle}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-pup-700 py-3 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition cursor-pointer"
                    >
                      <Printer className="h-4 w-4" />
                      <span>I-print ang Custom Barcode</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Visual Single ID Card Preview */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 shadow-sm flex flex-col items-center justify-center">
              <div className="mb-3 flex items-center justify-between w-full max-w-md">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Exact ID Card Size Preview (85.6mm × 54mm)
                </span>
                <span className="text-[11px] font-mono text-slate-400">CR80 Standard</span>
              </div>

              {/* ID Card with PUP Branding */}
              <div
                id="single-id-printable"
                className="w-full max-w-md rounded-2xl border-2 border-pup-800 bg-white p-5 shadow-xl text-center space-y-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2.5 text-left">
                    <img src="/logo200.svg" alt="PUP" className="h-9 w-9 object-contain" />
                    <div>
                      <div className="text-[11px] font-black tracking-wider text-pup-900 leading-tight">
                        POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
                      </div>
                      <div className="text-[9px] font-bold text-amber-700">
                        BATAAN BRANCH • AUTOMATED GATE PASS
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-800">
                    VERIFIED
                  </span>
                </div>

                {/* Person / Vehicle Info */}
                <div>
                  <h4 className="text-sm font-black text-slate-900 truncate">{currentTitle}</h4>
                  <p className="text-[11px] text-slate-600 font-semibold">{currentSubtitle}</p>
                </div>

                {/* THE ACTUAL REAL VISUAL BARCODE STRIPES */}
                <div className="py-1">
                  <BarcodeRenderer
                    value={currentBarcodeValue}
                    height={75}
                    width={1.9}
                    fontSize={13}
                  />
                </div>

                {/* Footer security badge */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[9px] text-slate-400">
                  <div className="flex items-center gap-1 text-slate-600 font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Official Gate Barrier Compatible</span>
                  </div>
                  <span>S.Y. 2026–2027</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 text-center max-w-sm">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Sakto ang sukat para sa plastic ID badge holder at student RFID sleeve.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk A4 Bond Paper Modal & Print Layout */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-pup-800" />
                  <span>Bulk Print sa A4 Bond Paper (8 ID Cards / Sheet)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Naka-format para sa Standard A4 (210mm × 297mm). Eksaktong 8 ID cards bawat bond paper na may cut guidelines.
                </p>
              </div>
              <button
                onClick={() => setBulkModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Print action bar */}
            <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-3 my-4 border border-slate-200">
              <div className="text-xs text-slate-700 font-semibold">
                Kabuuang Estudyante: <span className="font-bold text-pup-800">{filteredStudents.length}</span> •
                Mga Pahina ng A4 Bond Paper: <span className="font-bold text-pup-800">{bulkA4Pages.length} sheet(s)</span>
              </div>
              <button
                onClick={handlePrintBulk}
                className="flex items-center gap-2 rounded-xl bg-pup-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>I-print Ngayon sa A4 Bond Paper (Print / PDF)</span>
              </button>
            </div>

            {/* A4 Sheet Preview Container */}
            <div id="print-surface-bulk" className="space-y-6 overflow-y-auto">
              {bulkA4Pages.map((pageStudents, pageIdx) => (
                <div
                  key={pageIdx}
                  className="a4-print-page bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm mx-auto"
                  style={{ maxWidth: '210mm' }}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4 text-[10px] text-slate-400 uppercase font-mono">
                    <span>POLYTECHNIC UNIVERSITY OF THE PHILIPPINES - BATAAN BRANCH</span>
                    <span>A4 SHEET {pageIdx + 1} OF {bulkA4Pages.length}</span>
                  </div>

                  {/* 2-Column Grid × 4 Rows = 8 Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    {pageStudents.map((st) => (
                      <div
                        key={st.id}
                        className="rounded-xl border border-dashed border-slate-400 bg-white p-3.5 flex flex-col justify-between text-center space-y-2 relative"
                        style={{ height: '54mm', boxSizing: 'border-box' }}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                          <div className="flex items-center gap-2 text-left">
                            <img src="/logo200.svg" alt="PUP" className="h-6 w-6 object-contain" />
                            <div>
                              <div className="text-[9px] font-black tracking-wider text-pup-900 leading-tight">
                                PUP BATAAN BRANCH
                              </div>
                              <div className="text-[8px] font-bold text-amber-700">
                                AUTOMATED GATE PASS
                              </div>
                            </div>
                          </div>
                          <span className="rounded bg-emerald-50 px-1 py-0.5 text-[8px] font-bold text-emerald-800 border border-emerald-200">
                            VALID
                          </span>
                        </div>

                        {/* Name & ID */}
                        <div className="leading-tight">
                          <div className="text-[11px] font-black text-slate-900 truncate">
                            {st.first_name} {st.middle_name ? st.middle_name + ' ' : ''}{st.last_name}
                          </div>
                          <div className="text-[9px] font-semibold text-slate-600">
                            {st.student_number} • {st.course || 'BSIT'}
                            {st.year_level ? `-${st.year_level}` : ''}
                            {st.section || ''}
                          </div>
                        </div>

                        {/* Barcode */}
                        <div className="flex items-center justify-center py-0.5">
                          <BarcodeRenderer
                            value={st.student_number || st.qr_code || '2026-00000'}
                            height={42}
                            width={1.4}
                            fontSize={10}
                            className="p-1 border-0 shadow-none"
                          />
                        </div>

                        {/* Cut Line Hint */}
                        <div className="flex items-center justify-between text-[8px] text-slate-400 border-t border-slate-100 pt-1">
                          <span>S.Y. 2026–2027</span>
                          <span className="font-mono text-[7px] text-slate-300">✂ GUPITIN DITO</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
