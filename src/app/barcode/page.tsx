'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BarcodeRenderer from '@/components/BarcodeRenderer';
import JsBarcode from 'jsbarcode';
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
        fetch('/api/students', { cache: 'no-store' }),
        fetch('/api/vehicles', { cache: 'no-store' }),
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
        : 'Select student'
      : selectedType === 'vehicle'
      ? activeVehicle
        ? `Owner: ${activeVehicle.student?.first_name || ''} ${activeVehicle.student?.last_name || ''} (${activeVehicle.vehicle_type})`
        : 'Select vehicle'
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

  const downloadBarcodeOnlyAsPng = () => {
    try {
      const barcodeCanvas = document.createElement('canvas');
      JsBarcode(barcodeCanvas, currentBarcodeValue, {
        format: 'CODE128',
        width: 3.5,
        height: 140,
        displayValue: true,
        fontSize: 22,
        font: 'monospace',
        textMargin: 8,
        margin: 16,
        background: '#ffffff',
        lineColor: '#0f172a',
      });
      const link = document.createElement('a');
      link.download = `PUP-Barcode-${currentBarcodeValue.replace(/[^a-zA-Z0-9-]/g, '')}.png`;
      link.href = barcodeCanvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Error generating barcode image: ' + (err?.message || 'Unknown error'));
    }
  };

  const downloadSingleCardAsPng = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1012;
      canvas.height = 638;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background: Clean white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Maroon Outer Border
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#800000';
      ctx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);

      // Gold Accent Border
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#d97706';
      ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

      // Header text
      ctx.fillStyle = '#800000';
      ctx.font = 'bold 26px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('POLYTECHNIC UNIVERSITY OF THE PHILIPPINES', 115, 66);

      ctx.fillStyle = '#d97706';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillText('BATAAN BRANCH • AUTOMATED GATE PASS', 115, 96);

      // Header divider line
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(35, 120);
      ctx.lineTo(canvas.width - 35, 120);
      ctx.stroke();

      // Student Title / Full Name
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 34px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentTitle, canvas.width / 2, 175);

      // Subtitle
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.fillText(currentSubtitle, canvas.width / 2, 215);

      // Barcode stripes via JsBarcode
      const barcodeCanvas = document.createElement('canvas');
      try {
        JsBarcode(barcodeCanvas, currentBarcodeValue, {
          format: 'CODE128',
          width: 3.5,
          height: 155,
          displayValue: true,
          fontSize: 24,
          font: 'monospace',
          textMargin: 8,
          margin: 10,
          background: '#ffffff',
          lineColor: '#0f172a',
        });
        const bWidth = barcodeCanvas.width;
        const bX = (canvas.width - bWidth) / 2;
        ctx.drawImage(barcodeCanvas, bX, 260);
      } catch {
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 28px monospace';
        ctx.fillText(currentBarcodeValue, canvas.width / 2, 360);
      }

      // Footer divider line
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(35, 545);
      ctx.lineTo(canvas.width - 35, 545);
      ctx.stroke();

      // Footer badges
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('✔ Official Gate Barrier Compatible', 45, 585);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('S.Y. 2026–2027', canvas.width - 45, 585);

      // Draw PUP Seal emblem synchronously (guaranteed non-tainting)
      ctx.save();
      ctx.beginPath();
      ctx.arc(72, 72, 28, 0, Math.PI * 2);
      ctx.fillStyle = '#800000';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#d97706';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PUP', 72, 72);
      ctx.restore();

      // Trigger instant safe download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `PUP-Pass-${currentBarcodeValue.replace(/[^a-zA-Z0-9-]/g, '')}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Single card PNG error:', err);
      downloadBarcodeOnlyAsPng();
    }
  };

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
      subtitle="Generate, preview, and print official 1D Code 128 barcodes for student IDs (single or bulk A4 sheet)"
    >
      {/* Print CSS Styles injected inline */}
      <style jsx global>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          ${printTarget === 'bulk'
            ? `
          #print-surface-bulk,
          #print-surface-bulk * {
            visibility: visible !important;
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
          `
            : `
          #single-id-printable,
          #single-id-printable * {
            visibility: visible !important;
          }
          #single-id-printable {
            display: block !important;
            position: absolute !important;
            left: 10mm !important;
            top: 10mm !important;
            width: 85.6mm !important;
            min-height: 54mm !important;
            margin: 0 !important;
            padding: 16px !important;
            background: white !important;
            border: 2px solid #800000 !important;
            box-shadow: none !important;
          }
          `}
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
                <span>Filter by Course, Year Level (1-4), and Section</span>
              </div>
              <span className="text-xs font-semibold text-pup-800 bg-pup-50 px-2.5 py-0.5 rounded-full border border-pup-200">
                {filteredStudents.length} matching students
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Course */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Course / Program
                </label>
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-pup-700"
                >
                  <option value="all">All Courses</option>
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
                  Year Level
                </label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-pup-700"
                >
                  <option value="all">All Year Levels (1st-4th)</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>

              {/* Section */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Section
                </label>
                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-pup-700"
                >
                  <option value="all">All Sections</option>
                  {availableSections.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search text */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Name or Student ID
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search students..."
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
                    ? 'Select Student'
                    : selectedType === 'vehicle'
                    ? 'Select Registered Vehicle'
                    : 'Enter Barcode Value'}
                </h3>
                <span className="rounded-md bg-pup-100 px-2 py-0.5 text-[10px] font-bold text-pup-800">
                  CODE 128
                </span>
              </div>

              {/* Student Picker */}
              {selectedType === 'student' && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    Student for Single ID Pass
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
                      No students match the selected course/year/section filter.
                    </div>
                  )}

                  {/* Action Buttons: Download Card PNG, Download Barcode Only, Print Single, and Bulk A4 */}
                  <div className="pt-2 space-y-2">
                    <button
                      onClick={downloadSingleCardAsPng}
                      disabled={!activeStudent}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Single Pass ID Card (PNG Image File)</span>
                    </button>

                    <button
                      onClick={downloadBarcodeOnlyAsPng}
                      disabled={!activeStudent}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 py-2.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Barcode className="h-4 w-4 text-emerald-700" />
                      <span>Download Barcode Only (PNG Sticker)</span>
                    </button>

                    <button
                      onClick={handlePrintSingle}
                      disabled={!activeStudent}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-pup-700 py-3 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Print Single ID Pass (85.6mm × 54mm / PDF)</span>
                    </button>

                    <button
                      onClick={() => setBulkModalOpen(true)}
                      disabled={filteredStudents.length === 0}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-pup-800 bg-white py-3 text-xs font-bold text-pup-900 shadow-sm hover:bg-pup-50 transition disabled:opacity-50 cursor-pointer"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-pup-700" />
                      <span>
                        Bulk A4 Bond Paper Print ({filteredStudents.length} Students • {bulkA4Pages.length} Sheet{bulkA4Pages.length !== 1 ? 's' : ''})
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Vehicle Picker */}
              {selectedType === 'vehicle' && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    Registered License Plate
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
                      No vehicles currently registered in database.
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={handlePrintSingle}
                      disabled={!activeVehicle}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-pup-700 py-3 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition cursor-pointer"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Print Vehicle Gate Sticker Pass</span>
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
                    placeholder="e.g. 2026-PUP-001 or ABC-1234"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-mono font-bold uppercase outline-none focus:border-pup-700"
                  />
                  <div className="pt-2">
                    <button
                      onClick={handlePrintSingle}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-pup-700 py-3 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition cursor-pointer"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Print Custom Barcode</span>
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
                  Exact ID Card Size (85.6mm × 54mm)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={downloadBarcodeOnlyAsPng}
                    title="Download barcode stripes only as PNG"
                    className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    <Barcode className="h-3 w-3" />
                    <span>Barcode Only</span>
                  </button>
                  <button
                    onClick={downloadSingleCardAsPng}
                    title="Download full ID card as PNG image file"
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition cursor-pointer"
                  >
                    <Download className="h-3 w-3" />
                    <span>Card PNG</span>
                  </button>
                  <button
                    onClick={handlePrintSingle}
                    title="Print or save as PDF"
                    className="flex items-center gap-1 rounded-lg bg-pup-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-pup-800 transition cursor-pointer"
                  >
                    <Printer className="h-3 w-3" />
                    <span>Print / PDF</span>
                  </button>
                </div>
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
                <span>Standard size for plastic ID badge holders and student RFID sleeves.</span>
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
                  <span>Bulk Print on A4 Paper (8 ID Cards / Sheet)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Formatted for Standard A4 (210mm × 297mm). Exactly 8 ID cards per sheet with cutting guidelines.
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
                Total Students: <span className="font-bold text-pup-800">{filteredStudents.length}</span> •
                A4 Paper Sheets: <span className="font-bold text-pup-800">{bulkA4Pages.length} sheet(s)</span>
              </div>
              <button
                onClick={handlePrintBulk}
                className="flex items-center gap-2 rounded-xl bg-pup-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print Now on A4 Paper (Print / PDF)</span>
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
                          <span className="font-mono text-[7px] text-slate-300">✂ CUT HERE</span>
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
