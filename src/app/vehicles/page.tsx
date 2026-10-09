'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Car,
  Search,
  Plus,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Vehicle, Student } from '@/types/database';
import { VehicleFormSchema } from '@/lib/validation/schemas';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState({
    id: '',
    student_id: '',
    plate_number: '',
    brand_model: '',
    vehicle_type: 'motorcycle' as 'motorcycle' | 'car' | 'van' | 'bicycle' | 'other',
    color: 'Black',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Load vehicles
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('*, student:students(*)')
        .order('plate_number', { ascending: true });

      if (vehicleData && vehicleData.length > 0) {
        setVehicles(vehicleData as any);
      } else {
        // Mock fallback
        setVehicles([
          {
            id: 'v1',
            student_id: 's1',
            plate_number: 'ABC-1234',
            brand_model: 'Yamaha Aerox 155',
            vehicle_type: 'motorcycle',
            color: 'Black',
            is_active: true,
            created_at: '',
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
          },
          {
            id: 'v2',
            student_id: 's2',
            plate_number: 'DEF-5678',
            brand_model: 'Honda Click 125',
            vehicle_type: 'motorcycle',
            color: 'Red',
            is_active: true,
            created_at: '',
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
          },
          {
            id: 'v3',
            student_id: 's3',
            plate_number: 'GHI-9012',
            brand_model: 'Toyota Vios',
            vehicle_type: 'car',
            color: 'White',
            is_active: true,
            created_at: '',
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
          },
        ]);
      }

      // Load registered students for vehicle assignment & verification
      const { data: studentList } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'active')
        .order('first_name', { ascending: true });

      if (studentList && studentList.length > 0) {
        setStudents(studentList as any);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (!q) return true;
      const plate = v.plate_number.toLowerCase();
      const model = v.brand_model.toLowerCase();
      const studentName = `${v.student?.first_name || ''} ${v.student?.last_name || ''}`.toLowerCase();
      const studentNum = (v.student?.student_number || '').toLowerCase();
      return plate.includes(q) || model.includes(q) || studentName.includes(q) || studentNum.includes(q);
    });
  }, [vehicles, search]);

  // Filter students in dropdown
  const matchedStudents = useMemo(() => {
    const q = studentSearchQuery.trim().toLowerCase();
    if (!q) return students.slice(0, 10);
    return students.filter((s) => {
      const full = `${s.first_name} ${s.last_name}`.toLowerCase();
      const num = s.student_number.toLowerCase();
      return full.includes(q) || num.includes(q);
    }).slice(0, 10);
  }, [students, studentSearchQuery]);

  const handleOpenModal = () => {
    setForm({
      id: '',
      student_id: '',
      plate_number: '',
      brand_model: '',
      vehicle_type: 'motorcycle',
      color: 'Black',
    });
    setSelectedStudent(null);
    setStudentSearchQuery('');
    setFormErrors({});
    setSubmitError(null);
    setModalOpen(true);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setFormErrors({});

    if (!selectedStudent) {
      setFormErrors((prev) => ({
        ...prev,
        student_id: 'Kailangan pumili ng rehistradong Student o Faculty sa database.',
      }));
      setSubmitError('Pumili muna ng may-ari ng sasakyan mula sa database.');
      return;
    }

    // Validate using VehicleFormSchema
    const validationResult = VehicleFormSchema.safeParse({
      student_id: selectedStudent.id,
      plate_number: form.plate_number.trim().toUpperCase(),
      brand_model: form.brand_model.trim(),
      vehicle_type: form.vehicle_type,
      color: form.color.trim() || null,
    });

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setFormErrors(fieldErrors);
      setSubmitError('Pakitama ang mga may pulang marka bago mag-save.');
      return;
    }

    try {
      const supabase = createClient();
      const payload = {
        student_id: selectedStudent.id,
        plate_number: form.plate_number.trim().toUpperCase(),
        brand_model: form.brand_model.trim(),
        vehicle_type: form.vehicle_type,
        color: form.color.trim() || null,
        is_active: true,
      };

      const { error } = await supabase.from('vehicles').insert(payload);
      if (error) throw error;

      setModalOpen(false);
      loadData();
    } catch (err: any) {
      setSubmitError(err?.message || 'Hindi na-save ang sasakyan. Pakisuri kung may kaparehong plate number na.');
    }
  };

  return (
    <DashboardLayout
      title="Campus Vehicle Pass & RFID Registry"
      subtitle="Rehistradong mga motorsiklo at kotse ng students at faculty para sa awtomatikong gate barrier access"
    >
      <div className="space-y-4">
        {/* Top Controls */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mag-search gamit ang plate number (e.g., ABC-1234) o may-ari..."
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-pup-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              title="Refresh list"
              className="rounded-xl border border-slate-300 p-2.5 text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-1.5 rounded-xl bg-pup-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Mag-register ng Sasakyan</span>
            </button>
          </div>
        </div>

        {/* Vehicles Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">License Plate</th>
                  <th className="px-4 py-3">May-ari (Owner)</th>
                  <th className="px-4 py-3">Classification</th>
                  <th className="px-4 py-3">ID Number</th>
                  <th className="px-4 py-3">Brand & Model</th>
                  <th className="px-4 py-3">Uri ng Sasakyan</th>
                  <th className="px-4 py-3">Kulay</th>
                  <th className="px-4 py-3">Barrier Pass Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.length > 0 ? (
                  filteredVehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition">
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-block rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 font-mono text-xs font-black tracking-wider text-slate-900 shadow-sm">
                          {v.plate_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {v.student ? `${v.student.first_name} ${v.student.last_name}` : 'Hindi Natukoy'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                            v.student?.person_type === 'faculty'
                              ? 'bg-blue-100 text-blue-800'
                              : v.student?.person_type === 'staff'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {v.student?.person_type || 'student'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono font-semibold">
                        {v.student?.student_number || 'N/A'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{v.brand_model}</td>
                      <td className="px-4 py-3 text-xs capitalize text-slate-600">{v.vehicle_type}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{v.color || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> ACTIVE PASS
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-xs text-slate-400">
                      Walang rehistradong sasakyan na tumutugma sa search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Strict Vehicle Registration Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Mag-register ng Vehicle Pass</h3>
                <p className="text-xs text-slate-500">
                  Dapat may-ari ay verified student o faculty na nasa database.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {submitError && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>{submitError}</div>
              </div>
            )}

            <form onSubmit={handleSaveVehicle} className="mt-4 space-y-3.5">
              {/* Step 1: Student / Faculty Verification Picker */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  1. May-ari ng Sasakyan (Verified sa Database) *
                </label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/70 p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs">
                        <UserCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-emerald-950">
                          {selectedStudent.first_name} {selectedStudent.last_name}
                        </div>
                        <div className="text-[11px] text-emerald-700">
                          {selectedStudent.student_number} • {selectedStudent.person_type.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent(null);
                        setStudentSearchQuery('');
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-rose-600"
                    >
                      Palitan
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      placeholder="I-type ang pangalan o student number para hanapin sa listahan..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-pup-700"
                    />
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-1 divide-y divide-slate-100">
                      {matchedStudents.length > 0 ? (
                        matchedStudents.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedStudent(s);
                              setFormErrors((prev) => {
                                const copy = { ...prev };
                                delete copy.student_id;
                                return copy;
                              });
                            }}
                            className="flex items-center justify-between p-2 hover:bg-pup-50 rounded-lg cursor-pointer transition text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-900">
                                {s.first_name} {s.last_name}
                              </span>
                              <span className="ml-2 font-mono text-[11px] text-slate-500">
                                ({s.student_number})
                              </span>
                            </div>
                            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                              {s.person_type}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-400">
                          Walang natagpuang active student/faculty sa database.
                        </div>
                      )}
                    </div>
                    {formErrors.student_id && (
                      <span className="text-[11px] text-rose-600 font-semibold block">
                        {formErrors.student_id}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: License Plate (Strict check against -1 or invalid format) */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  2. License Plate Number *
                </label>
                <input
                  required
                  value={form.plate_number}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setForm({ ...form, plate_number: val });
                    if (val === '-1' || val.startsWith('-')) {
                      setFormErrors((prev) => ({
                        ...prev,
                        plate_number: 'Bawal ang negative number o "-1" sa plate number.',
                      }));
                    } else {
                      setFormErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.plate_number;
                        return copy;
                      });
                    }
                  }}
                  placeholder="Hal. ABC-1234 o ABC-123"
                  className={`w-full rounded-xl border px-3 py-2 text-sm font-mono font-black uppercase outline-none ${
                    formErrors.plate_number
                      ? 'border-rose-500 bg-rose-50/30'
                      : 'border-slate-300 focus:border-pup-700'
                  }`}
                />
                {formErrors.plate_number && (
                  <span className="text-[11px] text-rose-600 font-semibold mt-1 block">
                    {formErrors.plate_number}
                  </span>
                )}
              </div>

              {/* Step 3: Brand & Model */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  3. Brand & Model *
                </label>
                <input
                  required
                  value={form.brand_model}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({ ...form, brand_model: val });
                    if (val === '-1') {
                      setFormErrors((prev) => ({
                        ...prev,
                        brand_model: 'Bawal ang "-1" sa brand o model.',
                      }));
                    } else {
                      setFormErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.brand_model;
                        return copy;
                      });
                    }
                  }}
                  placeholder="Hal. Yamaha Aerox 155, Honda Click, Toyota Vios"
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                    formErrors.brand_model
                      ? 'border-rose-500 bg-rose-50/30'
                      : 'border-slate-300 focus:border-pup-700'
                  }`}
                />
                {formErrors.brand_model && (
                  <span className="text-[11px] text-rose-600 font-semibold mt-1 block">
                    {formErrors.brand_model}
                  </span>
                )}
              </div>

              {/* Step 4: Vehicle Type & Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Uri ng Sasakyan
                  </label>
                  <select
                    value={form.vehicle_type}
                    onChange={(e) => setForm({ ...form, vehicle_type: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pup-700"
                  >
                    <option value="motorcycle">Motorsiklo (Motorcycle)</option>
                    <option value="car">Kotse (Car)</option>
                    <option value="van">Van</option>
                    <option value="bicycle">Bisikleta (Bicycle)</option>
                    <option value="other">Iba pa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Kulay
                  </label>
                  <input
                    value={form.color}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm({ ...form, color: val });
                      if (val === '-1') {
                        setFormErrors((prev) => ({
                          ...prev,
                          color: 'Bawal ang "-1" sa kulay.',
                        }));
                      } else {
                        setFormErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.color;
                          return copy;
                        });
                      }
                    }}
                    placeholder="Black / Red / White"
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                      formErrors.color
                        ? 'border-rose-500 bg-rose-50/30'
                        : 'border-slate-300 focus:border-pup-700'
                    }`}
                  />
                  {formErrors.color && (
                    <span className="text-[11px] text-rose-600 font-semibold mt-1 block">
                      {formErrors.color}
                    </span>
                  )}
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
                  I-save ang Vehicle Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
