'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BulkUploadModal from '@/components/BulkUploadModal';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Barcode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  RefreshCw,
  FileSpreadsheet,
  GraduationCap,
  Briefcase,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Student, StudentStatus, PersonType } from '@/types/database';
import { StudentFormSchema } from '@/lib/validation/schemas';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [barcodeModal, setBarcodeModal] = useState<Student | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState<{
    id: string;
    student_number: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    person_type: PersonType;
    department: string;
    course: string;
    year_level: string;
    section: string;
    contact_number: string;
    rfid_uid: string;
    qr_code: string;
    status: StudentStatus;
  }>({
    id: '',
    student_number: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    person_type: 'student',
    department: '',
    course: 'BSIT',
    year_level: '1',
    section: 'A',
    contact_number: '',
    rfid_uid: '',
    qr_code: '',
    status: 'active',
  });

  const loadStudents = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('student_number', { ascending: true });

      if (!error && data && data.length > 0) {
        setStudents(data);
      } else {
        // Mock fallback data for offline/demo
        setStudents([
          {
            id: 's1',
            student_number: '2021-12345',
            first_name: 'Juan',
            middle_name: 'M.',
            last_name: 'Dela Cruz',
            person_type: 'student',
            course: 'BSIT',
            department: 'College of Computer Studies',
            year_level: 3,
            section: 'A',
            contact_number: '09171234567',
            rfid_uid: 'RFID-A101',
            qr_code: 'QR-PUP-2021-12345',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 's2',
            student_number: '2022-06789',
            first_name: 'Maria',
            middle_name: 'S.',
            last_name: 'Santos',
            person_type: 'student',
            course: 'BSBA',
            department: 'College of Business Administration',
            year_level: 2,
            section: 'B',
            contact_number: '09181234567',
            rfid_uid: 'RFID-B202',
            qr_code: 'QR-PUP-2022-06789',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 's3',
            student_number: 'FAC-2020-045',
            first_name: 'Ricardo',
            middle_name: 'G.',
            last_name: 'Alvarez',
            person_type: 'faculty',
            course: '',
            department: 'College of Engineering',
            year_level: null,
            section: '',
            contact_number: '09191234567',
            rfid_uid: 'RFID-FAC-01',
            qr_code: 'QR-FAC-2020-045',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 's4',
            student_number: '2023-11223',
            first_name: 'Ana',
            middle_name: 'L.',
            last_name: 'Cruz',
            person_type: 'student',
            course: 'BSCE',
            department: 'College of Engineering',
            year_level: 1,
            section: 'C',
            contact_number: '09061234567',
            rfid_uid: 'RFID-D404',
            qr_code: 'QR-PUP-2023-11223',
            status: 'suspended',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 's5',
            student_number: 'VIS-2024-889',
            first_name: 'Corazon',
            middle_name: '',
            last_name: 'Aquino',
            person_type: 'visitor',
            course: '',
            department: 'Guest Lecturer',
            year_level: null,
            section: '',
            contact_number: '09201234567',
            rfid_uid: null,
            qr_code: 'QR-VIS-2024-889',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
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
    loadStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (typeFilter !== 'all' && s.person_type !== typeFilter) return false;
      if (q) {
        const full = `${s.first_name} ${s.last_name}`.toLowerCase();
        const num = s.student_number.toLowerCase();
        const crs = (s.course || '').toLowerCase();
        const dept = (s.department || '').toLowerCase();
        const rfid = (s.rfid_uid || '').toLowerCase();
        const qr = (s.qr_code || '').toLowerCase();
        return (
          full.includes(q) ||
          num.includes(q) ||
          crs.includes(q) ||
          dept.includes(q) ||
          rfid.includes(q) ||
          qr.includes(q)
        );
      }
      return true;
    });
  }, [students, search, statusFilter, typeFilter]);

  const handleOpenAdd = () => {
    setForm({
      id: '',
      student_number: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      person_type: 'student',
      department: '',
      course: 'BSIT',
      year_level: '1',
      section: 'A',
      contact_number: '',
      rfid_uid: '',
      qr_code: '',
      status: 'active',
    });
    setFormErrors({});
    setSubmitError(null);
    setModalOpen(true);
  };

  const handleEdit = (s: Student) => {
    setForm({
      id: s.id,
      student_number: s.student_number,
      first_name: s.first_name,
      middle_name: s.middle_name || '',
      last_name: s.last_name,
      person_type: s.person_type || 'student',
      department: s.department || '',
      course: s.course || '',
      year_level: s.year_level ? String(s.year_level) : '',
      section: s.section || '',
      contact_number: s.contact_number || '',
      rfid_uid: s.rfid_uid || '',
      qr_code: s.qr_code || '',
      status: s.status,
    });
    setFormErrors({});
    setSubmitError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setFormErrors({});

    // Validate using StudentFormSchema
    const validationResult = StudentFormSchema.safeParse({
      student_number: form.student_number,
      first_name: form.first_name,
      middle_name: form.middle_name || null,
      last_name: form.last_name,
      person_type: form.person_type,
      department: form.department || null,
      course: form.course || null,
      year_level: form.year_level ? form.year_level : null,
      section: form.section || null,
      contact_number: form.contact_number || null,
      rfid_uid: form.rfid_uid || null,
      qr_code: form.qr_code || `QR-${form.student_number.trim()}`,
      status: form.status,
    });

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        const fieldName = err.path[0] as string;
        if (fieldName && !fieldErrors[fieldName]) {
          fieldErrors[fieldName] = err.message;
        }
      });
      setFormErrors(fieldErrors);
      setSubmitError('Pakitama ang mga may pulang marka bago magpatuloy.');
      return;
    }

    try {
      const supabase = createClient();
      const validData = validationResult.data;

      const payload = {
        student_number: validData.student_number,
        first_name: validData.first_name,
        middle_name: validData.middle_name,
        last_name: validData.last_name,
        person_type: validData.person_type,
        department: validData.department,
        course: validData.course,
        year_level: validData.year_level,
        section: validData.section,
        contact_number: validData.contact_number,
        rfid_uid: validData.rfid_uid,
        qr_code: validData.qr_code,
        status: validData.status,
      };

      if (form.id) {
        const { error } = await supabase.from('students').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('students').insert(payload);
        if (error) throw error;
      }

      setModalOpen(false);
      loadStudents();
    } catch (err: any) {
      setSubmitError(err?.message || 'Hindi na-save sa database. Pakisubukang muli.');
    }
  };

  return (
    <DashboardLayout
      title="Student & Personnel Verification Directory"
      subtitle="Masterlist ng mga enrolled students, faculty, staff, at visitors na awtorisadong pumasok sa gate"
    >
      <div className="space-y-4">
        {/* Controls & Quick Actions */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Mag-search gamit ang ID, pangalan, kurso, o RFID..."
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-pup-700 focus:ring-1 focus:ring-pup-700"
              />
            </div>

            {/* Filter by Role / Type */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-50"
            >
              <option value="all">Lahat ng Role</option>
              <option value="student">Students Lamang</option>
              <option value="faculty">Faculty / Guro Lamang</option>
              <option value="staff">Staff / Kawani Lamang</option>
              <option value="visitor">Visitors Lamang</option>
            </select>

            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-50"
            >
              <option value="all">Lahat ng Status</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadStudents}
              title="Refresh list"
              className="rounded-xl border border-slate-300 p-2.5 text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Bulk Upload Button */}
            <button
              onClick={() => setBulkModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-pup-200 bg-pup-50 px-3.5 py-2.5 text-xs font-bold text-pup-900 shadow-sm hover:bg-pup-100 transition"
            >
              <FileSpreadsheet className="h-4 w-4 text-pup-700" />
              <span>Bulk Upload (Excel / CSV)</span>
            </button>

            {/* Single Add Button */}
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 rounded-xl bg-pup-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Mag-register</span>
            </button>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">ID / Student No.</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Role / Classification</th>
                  <th className="px-4 py-3">Course / Department</th>
                  <th className="px-4 py-3">RFID Card UID</th>
                  <th className="px-4 py-3">QR Code Token</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold text-pup-800">
                        {s.student_number}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {s.first_name} {s.middle_name ? `${s.middle_name} ` : ''}
                        {s.last_name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                            s.person_type === 'faculty'
                              ? 'bg-blue-100 text-blue-800'
                              : s.person_type === 'staff'
                              ? 'bg-purple-100 text-purple-800'
                              : s.person_type === 'visitor'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {s.person_type || 'student'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {s.course ? (
                          <span>
                            {s.course} {s.year_level ? `- ${s.year_level}${s.section || ''}` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-500">{s.department || '—'}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">
                        {s.rfid_uid ? (
                          <span className="rounded bg-slate-100 px-2 py-0.5 border border-slate-200">
                            {s.rfid_uid}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Walang Card</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">
                        {s.qr_code ? (
                          <span className="rounded bg-slate-100 px-2 py-0.5 border border-slate-200">
                            {s.qr_code}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Walang QR</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            s.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.status === 'suspended'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {s.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setBarcodeModal(s)}
                            title="Generate QR Pass Card"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                          >
                            <Barcode className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(s)}
                            title="I-edit"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-pup-700"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                      Walang natagpuang records sa inyong criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Strict Registration / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {form.id ? 'I-edit ang Record' : 'Mag-register ng Student / Personnel'}
                </h3>
                <p className="text-xs text-slate-500">
                  Mahigpit ang pag-verify: Letra lang sa pangalan, numero lang sa numeric fields, bawal ang &quot;-1&quot;.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error Banner */}
            {submitError && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>{submitError}</div>
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-3.5">
              {/* Role & ID Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Role / Classification *
                  </label>
                  <select
                    value={form.person_type}
                    onChange={(e) => setForm({ ...form, person_type: e.target.value as PersonType })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-pup-700"
                  >
                    <option value="student">Student (Mag-aaral)</option>
                    <option value="faculty">Faculty / Teacher (Guro)</option>
                    <option value="staff">Staff / Admin Personnel</option>
                    <option value="visitor">Visitor / Guest</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    ID / Student Number *
                  </label>
                  <input
                    required
                    value={form.student_number}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm({ ...form, student_number: val });
                      if (val === '-1' || val.startsWith('-')) {
                        setFormErrors((prev) => ({
                          ...prev,
                          student_number: 'Bawal ang negative number o "-1".',
                        }));
                      } else {
                        setFormErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.student_number;
                          return copy;
                        });
                      }
                    }}
                    placeholder="Hal. 2021-12345 o FAC-2024-001"
                    className={`w-full rounded-xl border px-3 py-2 text-sm font-mono font-bold outline-none ${
                      formErrors.student_number
                        ? 'border-rose-500 bg-rose-50/30'
                        : 'border-slate-300 focus:border-pup-700'
                    }`}
                  />
                  {formErrors.student_number && (
                    <span className="text-[11px] text-rose-600 font-semibold mt-1 block">
                      {formErrors.student_number}
                    </span>
                  )}
                </div>
              </div>

              {/* Name Fields (First, Middle, Last) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    First Name *
                  </label>
                  <input
                    required
                    value={form.first_name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm({ ...form, first_name: val });
                      if (/\d/.test(val) || val.includes('-1')) {
                        setFormErrors((prev) => ({
                          ...prev,
                          first_name: 'Bawal ang numero o "-1". Mga letra lamang ang pwede.',
                        }));
                      } else {
                        setFormErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.first_name;
                          return copy;
                        });
                      }
                    }}
                    placeholder="Juan"
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                      formErrors.first_name
                        ? 'border-rose-500 bg-rose-50/30'
                        : 'border-slate-300 focus:border-pup-700'
                    }`}
                  />
                  {formErrors.first_name && (
                    <span className="text-[11px] text-rose-600 font-semibold mt-1 block">
                      {formErrors.first_name}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Middle Name
                  </label>
                  <input
                    value={form.middle_name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm({ ...form, middle_name: val });
                      if (/\d/.test(val) || val.includes('-1')) {
                        setFormErrors((prev) => ({
                          ...prev,
                          middle_name: 'Bawal ang numero o "-1".',
                        }));
                      } else {
                        setFormErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.middle_name;
                          return copy;
                        });
                      }
                    }}
                    placeholder="Mendoza"
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                      formErrors.middle_name
                        ? 'border-rose-500 bg-rose-50/30'
                        : 'border-slate-300 focus:border-pup-700'
                    }`}
                  />
                  {formErrors.middle_name && (
                    <span className="text-[11px] text-rose-600 font-semibold mt-1 block">
                      {formErrors.middle_name}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Last Name *
                  </label>
                  <input
                    required
                    value={form.last_name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm({ ...form, last_name: val });
                      if (/\d/.test(val) || val.includes('-1')) {
                        setFormErrors((prev) => ({
                          ...prev,
                          last_name: 'Bawal ang numero o "-1". Letra lamang.',
                        }));
                      } else {
                        setFormErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.last_name;
                          return copy;
                        });
                      }
                    }}
                    placeholder="Dela Cruz"
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                      formErrors.last_name
                        ? 'border-rose-500 bg-rose-50/30'
                        : 'border-slate-300 focus:border-pup-700'
                    }`}
                  />
                  {formErrors.last_name && (
                    <span className="text-[11px] text-rose-600 font-semibold mt-1 block">
                      {formErrors.last_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Department & Course / Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    College / Department
                  </label>
                  <input
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    placeholder="College of Computer Studies"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pup-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Program / Course
                  </label>
                  <input
                    value={form.course}
                    onChange={(e) => setForm({ ...form, course: e.target.value })}
                    placeholder="BSIT / BSBA / BSEE"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pup-700"
                  />
                </div>
              </div>

              {/* Year Level & Section & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Year Level (1-6)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={form.year_level}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm({ ...form, year_level: val });
                      if (val === '-1' || Number(val) < 0) {
                        setFormErrors((prev) => ({
                          ...prev,
                          year_level: 'Bawal ang "-1" o negative na taon.',
                        }));
                      } else {
                        setFormErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.year_level;
                          return copy;
                        });
                      }
                    }}
                    placeholder="1"
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                      formErrors.year_level
                        ? 'border-rose-500 bg-rose-50/30'
                        : 'border-slate-300 focus:border-pup-700'
                    }`}
                  />
                  {formErrors.year_level && (
                    <span className="text-[11px] text-rose-600 font-semibold mt-1 block">
                      {formErrors.year_level}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Section
                  </label>
                  <input
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                    placeholder="A"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pup-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Contact Number
                  </label>
                  <input
                    value={form.contact_number}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm({ ...form, contact_number: val });
                      if (val === '-1' || val.includes('-1')) {
                        setFormErrors((prev) => ({
                          ...prev,
                          contact_number: 'Bawal ang "-1" sa contact number.',
                        }));
                      } else {
                        setFormErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.contact_number;
                          return copy;
                        });
                      }
                    }}
                    placeholder="09171234567"
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                      formErrors.contact_number
                        ? 'border-rose-500 bg-rose-50/30'
                        : 'border-slate-300 focus:border-pup-700'
                    }`}
                  />
                  {formErrors.contact_number && (
                    <span className="text-[11px] text-rose-600 font-semibold mt-1 block">
                      {formErrors.contact_number}
                    </span>
                  )}
                </div>
              </div>

              {/* Hardware Credentials (RFID UID & QR Code) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    RFID UID Smart Card
                  </label>
                  <input
                    value={form.rfid_uid}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm({ ...form, rfid_uid: val });
                      if (val === '-1') {
                        setFormErrors((prev) => ({
                          ...prev,
                          rfid_uid: 'Bawal ang "-1" sa RFID UID.',
                        }));
                      } else {
                        setFormErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.rfid_uid;
                          return copy;
                        });
                      }
                    }}
                    placeholder="e.g. RFID-A101"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono outline-none focus:border-pup-700"
                  />
                  {formErrors.rfid_uid && (
                    <span className="text-[11px] text-rose-600 font-semibold mt-1 block">
                      {formErrors.rfid_uid}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as StudentStatus })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pup-700"
                  >
                    <option value="active">Active (May pahintulot pumasok)</option>
                    <option value="suspended">Suspended (Blocked sa gate)</option>
                    <option value="inactive">Inactive</option>
                    <option value="graduated">Graduated / Alumni</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Kanselahin
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-pup-700 py-2.5 text-xs font-bold text-white hover:bg-pup-800 transition shadow-sm"
                >
                  {form.id ? 'I-update ang Record' : 'I-save ang Record sa Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode & QR Generator Modal */}
      {barcodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="flex justify-end">
              <button
                onClick={() => setBarcodeModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pup-50 text-pup-700 mb-3">
              <Barcode className="h-8 w-8" />
            </div>
            <h4 className="text-base font-black text-slate-900">
              {barcodeModal.first_name} {barcodeModal.last_name}
            </h4>
            <p className="text-xs text-slate-500">
              {barcodeModal.student_number} • {barcodeModal.course || barcodeModal.department || barcodeModal.person_type}
            </p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm font-bold text-slate-800">
              {barcodeModal.qr_code || `QR-${barcodeModal.student_number}`}
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              Assigned RFID Card:{' '}
              <span className="font-mono text-slate-700 font-bold">
                {barcodeModal.rfid_uid || 'None'}
              </span>
            </p>

            <button
              onClick={() => window.print()}
              className="mt-5 w-full rounded-xl bg-pup-700 py-2.5 text-xs font-bold text-white hover:bg-pup-800"
            >
              Print Gate Pass Card
            </button>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onSuccess={() => {
          loadStudents();
        }}
      />
    </DashboardLayout>
  );
}
