'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BulkUploadModal from '@/components/BulkUploadModal';
import BarcodeRenderer from '@/components/BarcodeRenderer';
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
  Car,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isValidUUID } from '@/lib/utils';
import { Student, StudentStatus, PersonType, Vehicle } from '@/types/database';
import { StudentFormSchema } from '@/lib/validation/schemas';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [vehicleFilter, setVehicleFilter] = useState<'all' | 'with_vehicle' | 'no_vehicle'>('all');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [barcodeModal, setBarcodeModal] = useState<Student | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'super_admin' | 'admin' | 'faculty' | 'guard' | 'viewer'>('admin');

  // Detect current user role on mount and set appropriate filter
  useEffect(() => {
    async function checkRole() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          if (profile?.role) {
            const role = profile.role as any;
            setCurrentUserRole(role);
            if (role === 'guard') setTypeFilter('visitor');
            return;
          }
        }
        if (typeof document !== 'undefined') {
          const match = document.cookie.match(/pup_gate_demo_session=([^;]+)/);
          if (match && match[1]) {
            const role = match[1] as any;
            setCurrentUserRole(role);
            if (role === 'guard') setTypeFilter('visitor');
          }
        }
      } catch {}
    }
    checkRole();

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlType = urlParams.get('type');
      if (urlType) setTypeFilter(urlType);
    }
  }, []);

  // Form State
  const [form, setForm] = useState<{
    id: string;
    student_number: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    visitor_name: string;
    purpose_of_visit: string;
    person_type: 'student' | 'faculty' | 'visitor';
    course: string;
    year_level: string;
    section: string;
    contact_number: string;
    status: StudentStatus;
  }>({
    id: '',
    student_number: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    visitor_name: '',
    purpose_of_visit: '',
    person_type: 'student',
    course: 'BSIT',
    year_level: '1',
    section: '1',
    contact_number: '',
    status: 'active',
  });

  // Integrated Vehicle Registration State
  const [includeVehicle, setIncludeVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState<{
    id?: string;
    plate_number: string;
    brand_model: string;
    vehicle_type: 'motorcycle' | 'car' | 'van' | 'bicycle' | 'other';
    color: string;
  }>({
    plate_number: '',
    brand_model: '',
    vehicle_type: 'motorcycle',
    color: 'Black',
  });

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/students');
      const json = await res.json();
      if (res.ok && json.data) {
        setStudents(json.data);
      } else {
        setStudents([]);
      }
    } catch {
      setStudents([]);
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
      if (vehicleFilter === 'with_vehicle' && (!s.vehicles || s.vehicles.length === 0)) return false;
      if (vehicleFilter === 'no_vehicle' && s.vehicles && s.vehicles.length > 0) return false;
      if (q) {
        const full = `${s.first_name} ${s.last_name}`.toLowerCase();
        const num = s.student_number.toLowerCase();
        const crs = (s.course || '').toLowerCase();
        const dept = (s.department || '').toLowerCase();
        const plate = s.vehicles?.map((v) => v.plate_number.toLowerCase()).join(' ') || '';
        const model = s.vehicles?.map((v) => v.brand_model.toLowerCase()).join(' ') || '';
        return (
          full.includes(q) ||
          num.includes(q) ||
          crs.includes(q) ||
          dept.includes(q) ||
          plate.includes(q) ||
          model.includes(q)
        );
      }
      return true;
    });
  }, [students, search, statusFilter, typeFilter, vehicleFilter]);

  const handleOpenAdd = (preferredType?: 'student' | 'faculty' | 'visitor') => {
    const isGuard = currentUserRole === 'guard';
    const chosenType = preferredType || (isGuard ? 'visitor' : 'student');
    setForm({
      id: '',
      student_number: chosenType === 'visitor' ? `VIS-${Date.now().toString().slice(-6)}` : '',
      first_name: '',
      middle_name: '',
      last_name: '',
      visitor_name: '',
      purpose_of_visit: chosenType === 'visitor' ? 'Campus Inquiry / Official Business' : '',
      person_type: chosenType,
      course: chosenType === 'student' ? 'BSIT' : chosenType === 'faculty' ? 'College of Computer Studies' : 'Campus Visitor',
      year_level: '1',
      section: '1',
      contact_number: '',
      status: 'active',
    });
    setIncludeVehicle(false);
    setVehicleForm({
      plate_number: '',
      brand_model: '',
      vehicle_type: 'motorcycle',
      color: 'Black',
    });
    setFormErrors({});
    setSubmitError(null);
    setModalOpen(true);
  };

  const handleEdit = (s: Student) => {
    if (currentUserRole === 'guard' && s.person_type !== 'visitor') {
      alert('As Gate Guard, you are only authorized to modify Visitor Pass records.');
      return;
    }
    const isVisitor = s.person_type === 'visitor';
    const visitorFullName = isVisitor ? `${s.first_name} ${s.last_name}`.trim() : '';

    setForm({
      id: s.id,
      student_number: s.student_number,
      first_name: s.first_name,
      middle_name: s.middle_name || '',
      last_name: s.last_name,
      visitor_name: visitorFullName,
      purpose_of_visit: isVisitor ? (s.course || s.department || 'Campus Visitor') : '',
      person_type: (s.person_type === 'staff' ? 'faculty' : s.person_type) as any,
      course: s.course || s.department || (s.person_type === 'student' ? 'BSIT' : ''),
      year_level: s.year_level ? String(s.year_level) : '1',
      section: s.section || '1',
      contact_number: s.contact_number || '',
      status: s.status,
    });

    if (s.vehicles && s.vehicles.length > 0) {
      const v = s.vehicles[0];
      setIncludeVehicle(true);
      setVehicleForm({
        id: v.id,
        plate_number: v.plate_number,
        brand_model: v.brand_model,
        vehicle_type: v.vehicle_type,
        color: v.color || '',
      });
    } else {
      setIncludeVehicle(false);
      setVehicleForm({
        plate_number: '',
        brand_model: '',
        vehicle_type: 'motorcycle',
        color: 'Black',
      });
    }

    setFormErrors({});
    setSubmitError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setFormErrors({});

    let computedStudentNumber = form.student_number.trim();
    let computedFirstName = form.first_name.trim();
    let computedMiddleName = form.middle_name.trim() || null;
    let computedLastName = form.last_name.trim();
    let computedCourse = form.course.trim() || null;
    let computedDepartment = null;
    let computedYearLevel: number | null = null;
    let computedSection: string | null = null;

    if (form.person_type === 'student') {
      if (!computedStudentNumber) {
        setFormErrors({ student_number: 'Student ID Number is required.' });
        return;
      }
      if (!computedFirstName) {
        setFormErrors({ first_name: 'First name is required.' });
        return;
      }
      if (!computedLastName) {
        setFormErrors({ last_name: 'Last name is required.' });
        return;
      }
      if (!computedCourse) {
        setFormErrors({ course: 'Course / Program is required.' });
        return;
      }
      computedYearLevel = Number(form.year_level) || 1;
      computedSection = form.section || '1';
    } else if (form.person_type === 'faculty') {
      if (!computedStudentNumber) {
        setFormErrors({ student_number: 'Faculty / Employee ID is required.' });
        return;
      }
      if (!computedFirstName) {
        setFormErrors({ first_name: 'First name is required.' });
        return;
      }
      if (!computedLastName) {
        setFormErrors({ last_name: 'Last name is required.' });
        return;
      }
      computedYearLevel = null;
      computedSection = null;
    } else if (form.person_type === 'visitor') {
      if (!form.visitor_name.trim()) {
        setFormErrors({ visitor_name: 'Visitor / Guest Name is required.' });
        return;
      }
      if (!form.purpose_of_visit.trim()) {
        setFormErrors({ purpose_of_visit: 'Purpose of Visit is required.' });
        return;
      }
      if (!computedStudentNumber) {
        computedStudentNumber = `VIS-${Date.now().toString().slice(-6)}`;
      }
      const nameParts = form.visitor_name.trim().split(/\s+/);
      if (nameParts.length === 1) {
        computedFirstName = nameParts[0];
        computedLastName = 'Visitor';
      } else {
        computedFirstName = nameParts[0];
        computedLastName = nameParts.slice(1).join(' ');
      }
      computedCourse = form.purpose_of_visit.trim();
      computedDepartment = 'Campus Visitor / Guest';
      computedYearLevel = null;
      computedSection = null;
    }

    // Vehicle validation if enabled
    if (includeVehicle) {
      if (!vehicleForm.plate_number.trim()) {
        setFormErrors((prev) => ({ ...prev, plate_number: 'Plate number is required for vehicle pass.' }));
        return;
      }
      if (!vehicleForm.brand_model.trim()) {
        setFormErrors((prev) => ({ ...prev, brand_model: 'Vehicle brand and model are required.' }));
        return;
      }
    }

    try {
      const payload: any = {
        id: form.id || undefined,
        student_number: computedStudentNumber,
        first_name: computedFirstName,
        middle_name: computedMiddleName,
        last_name: computedLastName,
        person_type: form.person_type,
        department: computedDepartment,
        course: computedCourse,
        year_level: computedYearLevel,
        section: computedSection,
        contact_number: form.contact_number.trim() || null,
        rfid_uid: null,
        qr_code: `QR-${computedStudentNumber}`,
        status: form.status,
      };

      if (includeVehicle && vehicleForm.plate_number.trim()) {
        payload.vehicle = {
          id: vehicleForm.id,
          plate_number: vehicleForm.plate_number.trim().toUpperCase(),
          brand_model: vehicleForm.brand_model.trim(),
          vehicle_type: vehicleForm.vehicle_type,
          color: vehicleForm.color.trim() || null,
        };
      } else if (!includeVehicle && vehicleForm.id) {
        payload.delete_vehicle_id = vehicleForm.id;
      }

      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to save record to database.');
      }

      setModalOpen(false);
      loadStudents();
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to save record to database.');
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete the record for ${studentName}?`)) return;
    try {
      const res = await fetch(`/api/students?id=${encodeURIComponent(studentId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete record.');
      loadStudents();
    } catch (err: any) {
      alert(err?.message || 'Error while deleting record.');
    }
  };

  return (
    <DashboardLayout
      title={currentUserRole === 'guard' ? 'Visitor Pass Directory & Temporary Campus Access' : 'Student & Personnel Verification Directory'}
      subtitle={currentUserRole === 'guard' ? 'Manage visitor and guest gate passes for campus security' : 'Masterlist of enrolled students, faculty, staff, and visitors authorized for campus entry'}
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
                placeholder={currentUserRole === 'guard' ? 'Search by Pass ID, name, or office...' : 'Search by ID, name, course, or RFID...'}
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-pup-700 focus:ring-1 focus:ring-pup-700"
              />
            </div>

            {/* Filter by Role / Type (Staff Removed) */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-50"
            >
              <option value="all">All Roles</option>
              <option value="student">Students Only</option>
              <option value="faculty">Faculty Only</option>
              <option value="visitor">Visitors Only</option>
            </select>

            {/* Filter by Vehicle Pass */}
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value as any)}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-50"
            >
              <option value="all">All Vehicles</option>
              <option value="with_vehicle">With Vehicle Pass</option>
              <option value="no_vehicle">No Vehicle Pass</option>
            </select>

            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-50"
            >
              <option value="all">All Statuses</option>
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

            {/* Bulk Upload Button (Hidden for Guard) */}
            {currentUserRole !== 'guard' && (
              <button
                onClick={() => setBulkModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-pup-200 bg-pup-50 px-3.5 py-2.5 text-xs font-bold text-pup-900 shadow-sm hover:bg-pup-100 transition"
              >
                <FileSpreadsheet className="h-4 w-4 text-pup-700" />
                <span>Bulk Upload (Excel / CSV)</span>
              </button>
            )}

            {/* Single Add Button */}
            <button
              onClick={() => handleOpenAdd()}
              className="flex items-center gap-1.5 rounded-xl bg-pup-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition"
            >
              <Plus className="h-4 w-4" />
              <span>{currentUserRole === 'guard' ? 'Issue Visitor Pass' : 'Register Profile'}</span>
            </button>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">ID / Pass No.</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Course / Info</th>
                  <th className="px-4 py-3">Vehicle Pass</th>
                  <th className="px-4 py-3">QR Token</th>
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
                        {s.person_type === 'visitor' && s.first_name === 'Guest' && s.last_name === 'Visitor'
                          ? 'Campus Visitor'
                          : `${s.first_name} ${s.middle_name ? `${s.middle_name} ` : ''}${s.last_name}`}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                            s.person_type === 'faculty'
                              ? 'bg-blue-100 text-blue-800'
                              : s.person_type === 'visitor'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {s.person_type || 'student'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {s.person_type === 'student' ? (
                          <span className="font-semibold text-slate-800">
                            {s.course || 'BSIT'}
                            {s.year_level ? ` - Yr ${s.year_level}` : ''}
                            {s.section ? `, Sec ${s.section}` : ''}
                          </span>
                        ) : s.person_type === 'faculty' ? (
                          <span className="text-blue-900 font-medium">
                            {s.course || s.department || 'Faculty Member'}
                          </span>
                        ) : (
                          <span className="text-amber-900 font-medium italic">
                            Purpose: {s.course || s.department || 'Campus Visit'}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {s.vehicles && s.vehicles.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                            <Car className="h-3.5 w-3.5 text-emerald-600" />
                            <span>{s.vehicles[0].plate_number}</span>
                            <span className="text-[10px] text-emerald-600 font-normal">
                              ({s.vehicles[0].brand_model})
                            </span>
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              handleEdit(s);
                              setIncludeVehicle(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-400 hover:border-pup-600 hover:text-pup-700 transition"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add Vehicle</span>
                          </button>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                        {s.qr_code ? (
                          <span className="rounded bg-slate-100 px-2 py-0.5 border border-slate-200">
                            {s.qr_code}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No QR</span>
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
                          {currentUserRole === 'guard' && s.person_type !== 'visitor' ? (
                            <span className="text-[10px] font-semibold text-slate-400 italic px-2">
                              Protected
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(s)}
                                title={currentUserRole === 'guard' ? 'Edit Visitor Pass' : 'Edit'}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-pup-700"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              {(currentUserRole === 'admin' || currentUserRole === 'super_admin') && (
                                <button
                                  onClick={() => handleDeleteStudent(s.id, `${s.first_name} ${s.last_name}`)}
                                  title="Delete Record"
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                      No records found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dynamic Role-Based Registration & Vehicle Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {form.id
                    ? `Edit ${form.person_type === 'visitor' ? 'Visitor Pass' : form.person_type === 'faculty' ? 'Faculty Profile' : 'Student Profile'}`
                    : `Register ${form.person_type === 'visitor' ? 'Visitor Pass' : form.person_type === 'faculty' ? 'Faculty Member' : 'Student Profile'}`}
                </h3>
                <p className="text-xs text-slate-500">
                  {form.person_type === 'student' && 'Complete student details with course, year level (1-4), and section (1-4).'}
                  {form.person_type === 'faculty' && 'Register faculty member with department / program.'}
                  {form.person_type === 'visitor' && 'Issue campus visitor pass with visitor name and purpose of visit.'}
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

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {/* Role Selection Tabs (Staff Removed!) */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1.5">
                  Select Classification / Role:
                </label>
                <div className="flex rounded-2xl bg-slate-100 p-1">
                  <button
                    type="button"
                    disabled={currentUserRole === 'guard'}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        person_type: 'student',
                        course: prev.course && prev.course !== 'Campus Visitor' ? prev.course : 'BSIT',
                      }))
                    }
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                      form.person_type === 'student'
                        ? 'bg-white text-emerald-800 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'
                    }`}
                  >
                    <GraduationCap className="h-4 w-4 text-emerald-600" />
                    <span>Student</span>
                  </button>

                  <button
                    type="button"
                    disabled={currentUserRole === 'guard'}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        person_type: 'faculty',
                        course: prev.course && prev.course !== 'Campus Visitor' ? prev.course : 'College of Computer Studies',
                      }))
                    }
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                      form.person_type === 'faculty'
                        ? 'bg-white text-blue-800 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'
                    }`}
                  >
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    <span>Faculty</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        person_type: 'visitor',
                        student_number: prev.student_number || `VIS-${Date.now().toString().slice(-6)}`,
                        purpose_of_visit: prev.purpose_of_visit || 'Campus Inquiry / Official Business',
                      }))
                    }
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                      form.person_type === 'visitor'
                        ? 'bg-white text-amber-800 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserCheck className="h-4 w-4 text-amber-600" />
                    <span>Visitor / Guest</span>
                  </button>
                </div>
              </div>

              {/* ============================================================== */}
              {/* DYNAMIC FORM SECTION: STUDENT */}
              {/* ============================================================== */}
              {form.person_type === 'student' && (
                <div className="space-y-3.5">
                  {/* Student ID & Course (No College/Department - Unified to Course!) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Student ID Number *
                      </label>
                      <input
                        required
                        value={form.student_number}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm({ ...form, student_number: val });
                          if (val === '-1' || val.startsWith('-')) {
                            setFormErrors((prev) => ({ ...prev, student_number: 'Negative numbers or "-1" are not allowed.' }));
                          } else {
                            setFormErrors((prev) => {
                              const copy = { ...prev };
                              delete copy.student_number;
                              return copy;
                            });
                          }
                        }}
                        placeholder="e.g. 2021-12345-BN-0"
                        className={`w-full rounded-xl border px-3 py-2 text-sm font-mono font-bold outline-none ${
                          formErrors.student_number ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300 focus:border-pup-700'
                        }`}
                      />
                      {formErrors.student_number && (
                        <span className="text-[11px] text-rose-600 font-semibold mt-1 block">
                          {formErrors.student_number}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Course / Program *
                      </label>
                      <select
                        value={form.course}
                        onChange={(e) => setForm({ ...form, course: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-pup-700"
                      >
                        <option value="BSIT">BSIT - Bachelor of Science in Information Technology</option>
                        <option value="BSCpE">BSCpE - Bachelor of Science in Computer Engineering</option>
                        <option value="BSEE">BSEE - Bachelor of Science in Electrical Engineering</option>
                        <option value="BSME">BSME - Bachelor of Science in Mechanical Engineering</option>
                        <option value="BSIE">BSIE - Bachelor of Science in Industrial Engineering</option>
                        <option value="BSBA">BSBA - Bachelor of Science in Business Administration</option>
                        <option value="BSED">BSED - Bachelor of Secondary Education</option>
                        <option value="BEED">BEED - Bachelor of Elementary Education</option>
                        <option value="BSHM">BSHM - Bachelor of Science in Hospitality Management</option>
                        <option value="DOMT">DOMT - Diploma in Office Management Technology</option>
                      </select>
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
                            setFormErrors((prev) => ({ ...prev, first_name: 'Numbers or "-1" are not allowed. Letters only.' }));
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
                          formErrors.first_name ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300 focus:border-pup-700'
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
                            setFormErrors((prev) => ({ ...prev, middle_name: 'Numbers or "-1" are not allowed.' }));
                          } else {
                            setFormErrors((prev) => {
                              const copy = { ...prev };
                              delete copy.middle_name;
                              return copy;
                            });
                          }
                        }}
                        placeholder="Mendoza"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pup-700"
                      />
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
                            setFormErrors((prev) => ({ ...prev, last_name: 'Numbers or "-1" are not allowed. Letters only.' }));
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
                          formErrors.last_name ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300 focus:border-pup-700'
                        }`}
                      />
                      {formErrors.last_name && (
                        <span className="text-[11px] text-rose-600 font-semibold mt-1 block">
                          {formErrors.last_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Year Level (1-4), Section (1-4), and Contact */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Year Level (1 to 4) *
                      </label>
                      <select
                        value={form.year_level}
                        onChange={(e) => setForm({ ...form, year_level: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-pup-700"
                      >
                        <option value="1">1st Year (1)</option>
                        <option value="2">2nd Year (2)</option>
                        <option value="3">3rd Year (3)</option>
                        <option value="4">4th Year (4)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Section (1 to 4) *
                      </label>
                      <select
                        value={form.section}
                        onChange={(e) => setForm({ ...form, section: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-pup-700"
                      >
                        <option value="1">Section 1</option>
                        <option value="2">Section 2</option>
                        <option value="3">Section 3</option>
                        <option value="4">Section 4</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Contact Number
                      </label>
                      <input
                        value={form.contact_number}
                        onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                        placeholder="09171234567"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pup-700"
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as StudentStatus })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pup-700"
                    >
                      <option value="active">Active (Authorized)</option>
                      <option value="suspended">Suspended (Blocked)</option>
                      <option value="inactive">Inactive</option>
                      <option value="graduated">Graduated / Alumni</option>
                    </select>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* DYNAMIC FORM SECTION: FACULTY */}
              {/* ============================================================== */}
              {form.person_type === 'faculty' && (
                <div className="space-y-3.5">
                  {/* Faculty ID & Department/Course */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Faculty / Employee ID *
                      </label>
                      <input
                        required
                        value={form.student_number}
                        onChange={(e) => setForm({ ...form, student_number: e.target.value })}
                        placeholder="e.g. FAC-2024-001"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono font-bold outline-none focus:border-pup-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Program / Department *
                      </label>
                      <input
                        required
                        value={form.course}
                        onChange={(e) => setForm({ ...form, course: e.target.value })}
                        placeholder="e.g. College of Computer Studies / BSIT"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pup-700"
                      />
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
                        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                        placeholder="Maria"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pup-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Middle Name
                      </label>
                      <input
                        value={form.middle_name}
                        onChange={(e) => setForm({ ...form, middle_name: e.target.value })}
                        placeholder="Santos"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pup-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Last Name *
                      </label>
                      <input
                        required
                        value={form.last_name}
                        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                        placeholder="Reyes"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pup-700"
                      />
                    </div>
                  </div>

                  {/* Contact & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Contact Number
                      </label>
                      <input
                        value={form.contact_number}
                        onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                        placeholder="09171234567"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pup-700"
                      />
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
                        <option value="active">Active (Authorized)</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* DYNAMIC FORM SECTION: VISITOR / GUEST */}
              {/* ============================================================== */}
              {form.person_type === 'visitor' && (
                <div className="space-y-3.5">
                  {/* Visitor Name & Purpose of Visit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Visitor / Guest Full Name *
                      </label>
                      <input
                        required
                        value={form.visitor_name}
                        onChange={(e) => setForm({ ...form, visitor_name: e.target.value })}
                        placeholder="e.g. Robert M. Santos or Company Representative"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-pup-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Purpose of Visit *
                      </label>
                      <input
                        required
                        value={form.purpose_of_visit}
                        onChange={(e) => setForm({ ...form, purpose_of_visit: e.target.value })}
                        placeholder="e.g. Official Business, Document Request, Meeting"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pup-700"
                      />
                    </div>
                  </div>

                  {/* Visitor Pass ID & Contact Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Visitor Pass Badge ID
                      </label>
                      <input
                        value={form.student_number}
                        onChange={(e) => setForm({ ...form, student_number: e.target.value })}
                        placeholder="e.g. VIS-123456"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono font-bold outline-none focus:border-pup-700 bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Contact Number (Optional)
                      </label>
                      <input
                        value={form.contact_number}
                        onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                        placeholder="09171234567"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pup-700"
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as StudentStatus })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pup-700"
                    >
                      <option value="active">Active (Granted Access)</option>
                      <option value="inactive">Inactive / Checked Out</option>
                    </select>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* INTEGRATED VEHICLE PASS REGISTRATION (FOR ALL ROLES) */}
              {/* ============================================================== */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-pup-700" />
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-800">
                      Vehicle Pass Registration (Optional)
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-pup-800">
                    <input
                      type="checkbox"
                      checked={includeVehicle}
                      onChange={(e) => setIncludeVehicle(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-pup-700 focus:ring-pup-700"
                    />
                    <span>{includeVehicle ? 'Vehicle Pass Active' : 'Register Vehicle Pass'}</span>
                  </label>
                </div>

                {includeVehicle && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                          Plate Number *
                        </label>
                        <input
                          value={vehicleForm.plate_number}
                          onChange={(e) =>
                            setVehicleForm({ ...vehicleForm, plate_number: e.target.value.toUpperCase() })
                          }
                          placeholder="e.g. ABC 1234 or 123 ABC"
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono font-bold uppercase outline-none focus:border-pup-700 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                          Vehicle Type *
                        </label>
                        <select
                          value={vehicleForm.vehicle_type}
                          onChange={(e) =>
                            setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value as any })
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-pup-700 bg-white"
                        >
                          <option value="motorcycle">Motorcycle</option>
                          <option value="car">Car</option>
                          <option value="van">Van</option>
                          <option value="bicycle">Bicycle</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                          Brand & Model *
                        </label>
                        <input
                          value={vehicleForm.brand_model}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, brand_model: e.target.value })}
                          placeholder="e.g. Honda Click 125i, Toyota Vios"
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pup-700 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                          Color
                        </label>
                        <input
                          value={vehicleForm.color}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                          placeholder="e.g. Black, White, Red"
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pup-700 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-pup-700 py-2.5 text-xs font-bold text-white hover:bg-pup-800 transition shadow-sm cursor-pointer"
                >
                  {form.id ? 'Update Profile & Pass' : 'Save Profile & Pass'}
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

            <div className="mt-4">
              <BarcodeRenderer
                value={barcodeModal.qr_code || barcodeModal.student_number}
                height={80}
                width={1.9}
                fontSize={13}
              />
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
