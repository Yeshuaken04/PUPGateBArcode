'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  GraduationCap,
  Briefcase,
  UserCheck,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PersonType, StudentStatus } from '@/types/database';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentRole?: string;
}

interface ParsedRow {
  rowIndex: number;
  student_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  person_type: PersonType;
  department?: string;
  course?: string;
  year_level?: number | null;
  section?: string;
  contact_number?: string;
  rfid_uid?: string;
  qr_code?: string;
  status: StudentStatus;
  isValid: boolean;
  errors: string[];
}

const NAME_REGEX = /^[a-zA-Z\s.,'-]+$/;
const PHONE_REGEX = /^(09|\+639)\d{9}$/;

export default function BulkUploadModal({
  isOpen,
  onClose,
  onSuccess,
  currentRole = 'admin',
}: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [filterView, setFilterView] = useState<'all' | 'valid' | 'invalid'>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessSummary, setUploadSuccessSummary] = useState<{
    students: number;
    faculty: number;
    staff: number;
    visitors: number;
    total: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. Download official template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'ID / Student Number': '2021-12345',
        'First Name': 'Juan',
        'Middle Name': 'Mendoza',
        'Last Name': 'Dela Cruz',
        'Role / Category': 'student',
        Department: 'College of Computer Studies',
        Course: 'BSIT',
        'Year Level': 3,
        Section: 'A',
        'Contact Number': '09171234567',
        'RFID UID': 'RFID-A101',
        Status: 'active',
      },
      {
        'ID / Student Number': 'FAC-2023-010',
        'First Name': 'Maria Teresa',
        'Middle Name': 'Santos',
        'Last Name': 'Reyes',
        'Role / Category': 'faculty',
        Department: 'Engineering and Technology',
        Course: '',
        'Year Level': '',
        Section: '',
        'Contact Number': '09181234567',
        'RFID UID': 'RFID-FAC-10',
        Status: 'active',
      },
      {
        'ID / Student Number': 'STF-2022-004',
        'First Name': 'Jose',
        'Middle Name': '',
        'Last Name': 'Hernandez',
        'Role / Category': 'staff',
        Department: 'Campus Security & General Services',
        Course: '',
        'Year Level': '',
        Section: '',
        'Contact Number': '09191234567',
        'RFID UID': 'RFID-STF-04',
        Status: 'active',
      },
      {
        'ID / Student Number': 'VIS-2024-901',
        'First Name': 'Corazon',
        'Middle Name': '',
        'Last Name': 'Aquino',
        'Role / Category': 'visitor',
        Department: 'Visiting Evaluator / CHED',
        Course: '',
        'Year Level': '',
        Section: '',
        'Contact Number': '09201234567',
        'RFID UID': '',
        Status: 'active',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PUP_Directory_Verification');
    XLSX.writeFile(wb, 'pup_student_faculty_verification_template.xlsx');
  };

  // 2. Parse uploaded Excel / CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setUploadError(null);
    setUploadSuccessSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rawJson.length === 0) {
          setUploadError('Walang laman o walang valid na rows ang napiling Excel file.');
          return;
        }

        // Validate and map rows
        const parsed: ParsedRow[] = rawJson.map((row, index) => {
          const rowNum = index + 2; // header is row 1
          const errors: string[] = [];

          // Helper to find column regardless of casing / spaces
          const getVal = (...keys: string[]): string => {
            for (const key of keys) {
              const match = Object.keys(row).find(
                (k) => k.trim().toLowerCase().replace(/[-_ ]/g, '') === key.toLowerCase().replace(/[-_ ]/g, '')
              );
              if (match && row[match] !== undefined && row[match] !== null) {
                return String(row[match]).trim();
              }
            }
            return '';
          };

          const idNum = getVal('id', 'studentnumber', 'idnumber', 'student_number', 'employeeid', 'idnum');
          const firstName = getVal('firstname', 'first_name', 'pangalan');
          const middleName = getVal('middlename', 'middle_name', 'mi', 'm.i.');
          const lastName = getVal('lastname', 'last_name', 'apelyido');
          const rawRole = getVal('role', 'person_type', 'type', 'category', 'persontype');
          const department = getVal('department', 'dept', 'departamento', 'college', 'office');
          const course = getVal('course', 'curso', 'program');
          const rawYear = getVal('yearlevel', 'year_level', 'year', 'level', 'taon');
          const section = getVal('section', 'sec');
          const contact = getVal('contactnumber', 'contact_number', 'contact', 'phone', 'mobile');
          const rfid = getVal('rfiduid', 'rfid_uid', 'rfid', 'carduid', 'card');
          const qr = getVal('qrcode', 'qr_code', 'qr');
          const rawStatus = getVal('status', 'estado');

          // Strict ID Check
          if (!idNum) {
            errors.push('Kulang ang ID / Student Number.');
          } else if (idNum === '-1' || idNum.startsWith('-')) {
            errors.push('Bawal ang negative number o "-1" sa ID.');
          }

          // Strict Name Check (letters only, NO numbers or -1)
          if (!firstName) {
            errors.push('Kulang ang First Name.');
          } else if (firstName === '-1' || firstName.includes('-1')) {
            errors.push('Bawal ang "-1" sa First Name.');
          } else if (!NAME_REGEX.test(firstName)) {
            errors.push('First Name: Mga letra lamang ang pwede (bawal ang numero o symbols).');
          }

          if (!lastName) {
            errors.push('Kulang ang Last Name.');
          } else if (lastName === '-1' || lastName.includes('-1')) {
            errors.push('Bawal ang "-1" sa Last Name.');
          } else if (!NAME_REGEX.test(lastName)) {
            errors.push('Last Name: Mga letra lamang ang pwede (bawal ang numero).');
          }

          if (middleName && (!NAME_REGEX.test(middleName) || middleName === '-1')) {
            errors.push('Middle Name: Bawal ang numero o "-1".');
          }

          // Parse role / person_type
          let personType: PersonType = 'student';
          const lowerRole = rawRole.toLowerCase();
          if (
            lowerRole.includes('faculty') ||
            lowerRole.includes('teach') ||
            lowerRole.includes('prof') ||
            lowerRole.includes('instructor') ||
            lowerRole.includes('guro')
          ) {
            personType = 'faculty';
          } else if (
            lowerRole.includes('staff') ||
            lowerRole.includes('employee') ||
            lowerRole.includes('guard') ||
            lowerRole.includes('kawani') ||
            lowerRole.includes('admin')
          ) {
            personType = 'staff';
          } else if (
            lowerRole.includes('visitor') ||
            lowerRole.includes('guest') ||
            lowerRole.includes('bisita') ||
            lowerRole.includes('parent')
          ) {
            personType = 'visitor';
          } else {
            personType = 'student';
          }

          // Year Level Check
          let yearLevel: number | null = null;
          if (rawYear) {
            if (rawYear === '-1' || rawYear.startsWith('-')) {
              errors.push('Bawal ang negative o "-1" sa Year Level.');
            } else {
              const num = parseInt(rawYear, 10);
              if (isNaN(num) || num < 1 || num > 6) {
                errors.push('Year level must be between 1 and 6.');
              } else {
                yearLevel = num;
              }
            }
          }

          // Contact Number Check
          let cleanedContact: string | undefined = undefined;
          if (contact) {
            if (contact === '-1' || contact.includes('-1')) {
              errors.push('Bawal ang "-1" sa Contact Number.');
            } else if (!PHONE_REGEX.test(contact)) {
              errors.push('Contact must be an 11-digit PH mobile number (09xxxxxxxxx).');
            } else {
              cleanedContact = contact;
            }
          }

          // Status Check
          let status: StudentStatus = 'active';
          const lowerStatus = rawStatus.toLowerCase();
          if (['active', 'inactive', 'suspended', 'graduated'].includes(lowerStatus)) {
            status = lowerStatus as StudentStatus;
          }

          return {
            rowIndex: rowNum,
            student_number: idNum,
            first_name: firstName,
            middle_name: middleName || undefined,
            last_name: lastName,
            person_type: personType,
            department: department || undefined,
            course: course || undefined,
            year_level: yearLevel,
            section: section || undefined,
            contact_number: cleanedContact,
            rfid_uid: rfid || undefined,
            qr_code: qr || `QR-${idNum}`,
            status,
            isValid: errors.length === 0,
            errors,
          };
        });

        setParsedRows(parsed);
      } catch (err: any) {
        setUploadError(`Failed to parse file: ${err?.message || 'Invalid format'}`);
      }
    };

    reader.readAsBinaryString(uploadedFile);
  };

  // 3. Submit valid rows to Supabase
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setUploadError('Walang valid na records na pwedeng i-save.');
      return;
    }

    setIsProcessing(true);
    setUploadProgress(10);
    setUploadError(null);

    try {
      const supabase = createClient();

      const batchData = validRows.map((r) => ({
        student_number: r.student_number,
        first_name: r.first_name,
        middle_name: r.middle_name || null,
        last_name: r.last_name,
        person_type: r.person_type,
        department: r.department || null,
        course: r.course || null,
        year_level: r.year_level || null,
        section: r.section || null,
        contact_number: r.contact_number || null,
        rfid_uid: r.rfid_uid || null,
        qr_code: r.qr_code || `QR-${r.student_number}`,
        status: r.status,
      }));

      // Upsert in batches of 50
      const BATCH_SIZE = 50;
      let processed = 0;

      for (let i = 0; i < batchData.length; i += BATCH_SIZE) {
        const chunk = batchData.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('students').upsert(chunk, {
          onConflict: 'student_number',
        });

        if (error) {
          throw new Error(`Database Error: ${error.message}`);
        }

        processed += chunk.length;
        setUploadProgress(Math.round((processed / batchData.length) * 90) + 10);
      }

      // Calculate summary
      const summary = {
        students: validRows.filter((r) => r.person_type === 'student').length,
        faculty: validRows.filter((r) => r.person_type === 'faculty').length,
        staff: validRows.filter((r) => r.person_type === 'staff').length,
        visitors: validRows.filter((r) => r.person_type === 'visitor').length,
        total: validRows.length,
      };

      setUploadSuccessSummary(summary);
      onSuccess();
    } catch (err: any) {
      setUploadError(err.message || 'Error occurred while saving to database.');
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  const displayRows = parsedRows.filter((r) => {
    if (filterView === 'valid') return r.isValid;
    if (filterView === 'invalid') return !r.isValid;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pup-700 text-white shadow-sm">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Bulk Add & Verification Upload (Excel / CSV)
              </h3>
              <p className="text-xs text-slate-500">
                I-upload ang masterlist ng students, teachers/faculty, staff, at visitors para ma-verify sa database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Top Actions & Template Download */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <span className="font-bold">May strict validation ang system:</span> Bawal ang numero o{' '}
                <code className="rounded bg-white px-1.5 py-0.5 font-mono font-bold text-pup-800">-1</code> sa pangalan,
                bawal ang negative numbers, at kailangan valid ang ID format.
              </div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              type="button"
              className="inline-flex items-center gap-2 shrink-0 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-amber-900 shadow-sm hover:bg-amber-100 transition"
            >
              <Download className="h-4 w-4 text-amber-700" />
              Download Excel Template
            </button>
          </div>

          {/* Success Banner */}
          {uploadSuccessSummary && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 space-y-3">
              <div className="flex items-center gap-2.5 font-black text-emerald-950">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                Matagumpay na na-upload at na-verify ang {uploadSuccessSummary.total} records sa database!
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="rounded-xl bg-white p-2.5 shadow-xs border border-emerald-100">
                  <div className="text-slate-500 font-medium">Students</div>
                  <div className="text-lg font-black text-pup-800">{uploadSuccessSummary.students}</div>
                </div>
                <div className="rounded-xl bg-white p-2.5 shadow-xs border border-emerald-100">
                  <div className="text-slate-500 font-medium">Faculty / Teachers</div>
                  <div className="text-lg font-black text-blue-700">{uploadSuccessSummary.faculty}</div>
                </div>
                <div className="rounded-xl bg-white p-2.5 shadow-xs border border-emerald-100">
                  <div className="text-slate-500 font-medium">Staff & Personnel</div>
                  <div className="text-lg font-black text-purple-700">{uploadSuccessSummary.staff}</div>
                </div>
                <div className="rounded-xl bg-white p-2.5 shadow-xs border border-emerald-100">
                  <div className="text-slate-500 font-medium">Visitors</div>
                  <div className="text-lg font-black text-amber-700">{uploadSuccessSummary.visitors}</div>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {uploadError && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
              <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <div className="flex-1">{uploadError}</div>
            </div>
          )}

          {/* Upload Dropzone */}
          {!file && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-8 text-center cursor-pointer hover:border-pup-600 hover:bg-pup-50/30 transition group"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-pup-700 shadow-sm group-hover:scale-105 transition">
                <Upload className="h-7 w-7" />
              </div>
              <div className="mt-3 text-sm font-bold text-slate-800">
                Pindutin o i-drag dito ang inyong Excel / CSV file
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Tumatanggap ng .xlsx, .xls, o .csv format (hanggang 2,000+ rows)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {/* File Selected & Preview */}
          {file && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-pup-700 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">{file.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} kabuuang rows na-detect
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setFile(null);
                      setParsedRows([]);
                      setUploadSuccessSummary(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    type="button"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Palitan ang File
                  </button>
                </div>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <button
                    onClick={() => setFilterView('all')}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      filterView === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Lahat ({parsedRows.length})
                  </button>
                  <button
                    onClick={() => setFilterView('valid')}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 transition ${
                      filterView === 'valid'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Valid ({validCount})
                  </button>
                  <button
                    onClick={() => setFilterView('invalid')}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 transition ${
                      filterView === 'invalid'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    May Error ({invalidCount})
                  </button>
                </div>

                <div className="text-[11px] font-semibold text-slate-500">
                  {validCount} sa {parsedRows.length} ang handang i-save
                </div>
              </div>

              {/* Preview Table */}
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-3 py-2.5">Row</th>
                      <th className="px-3 py-2.5">ID Number</th>
                      <th className="px-3 py-2.5">Full Name</th>
                      <th className="px-3 py-2.5">Role / Type</th>
                      <th className="px-3 py-2.5">Course / Dept</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Validation Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayRows.length > 0 ? (
                      displayRows.map((r) => (
                        <tr
                          key={r.rowIndex}
                          className={`hover:bg-slate-50 transition ${
                            !r.isValid ? 'bg-rose-50/50' : ''
                          }`}
                        >
                          <td className="px-3 py-2 font-mono text-slate-400">#{r.rowIndex}</td>
                          <td className="px-3 py-2 font-mono font-bold text-slate-900">
                            {r.student_number || '—'}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            {r.first_name} {r.middle_name ? `${r.middle_name} ` : ''}
                            {r.last_name}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                                r.person_type === 'faculty'
                                  ? 'bg-blue-100 text-blue-800'
                                  : r.person_type === 'staff'
                                  ? 'bg-purple-100 text-purple-800'
                                  : r.person_type === 'visitor'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {r.person_type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {r.course || r.department || '—'}
                          </td>
                          <td className="px-3 py-2">
                            {r.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" /> Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                                <XCircle className="h-3 w-3" /> May Error
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-[11px]">
                            {r.errors.length > 0 ? (
                              <span className="text-rose-600 font-medium">
                                {r.errors.join('; ')}
                              </span>
                            ) : (
                              <span className="text-slate-400">Handa nang i-verify</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                          Walang records sa filter na ito.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          <button
            onClick={onClose}
            type="button"
            disabled={isProcessing}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
          >
            Isara
          </button>

          {file && (
            <div className="flex items-center gap-3">
              {isProcessing && (
                <div className="flex items-center gap-2 text-xs font-semibold text-pup-800">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Nagsusulat sa database ({uploadProgress}%)...</span>
                </div>
              )}
              <button
                onClick={handleConfirmImport}
                disabled={isProcessing || validCount === 0}
                type="button"
                className="flex items-center gap-2 rounded-xl bg-pup-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition disabled:opacity-50 cursor-pointer"
              >
                <UserCheck className="h-4 w-4" />
                <span>I-save ang {validCount} Valid Records sa Database</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
