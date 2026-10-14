'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Car,
  Search,
  RefreshCw,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Bike,
} from 'lucide-react';
import { Vehicle } from '@/types/database';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vehicles', { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json.data) {
        setVehicles(json.data);
      } else {
        setVehicles([]);
      }
    } catch {
      setVehicles([]);
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

  const handleDeleteVehicle = async (v: Vehicle) => {
    if (!confirm(`Are you sure you want to revoke the vehicle pass with plate "${v.plate_number}"?`)) return;
    try {
      const res = await fetch(`/api/vehicles?id=${encodeURIComponent(v.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke vehicle pass.');
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Error while revoking vehicle pass.');
    }
  };

  const motorcycleCount = useMemo(() => vehicles.filter((v) => v.vehicle_type === 'motorcycle').length, [vehicles]);
  const carCount = useMemo(() => vehicles.filter((v) => v.vehicle_type === 'car').length, [vehicles]);

  return (
    <DashboardLayout
      title="Campus Registered Vehicles"
      subtitle="View-only directory of authorized vehicles and motorcycles linked to student and faculty profiles."
    >
      <div className="space-y-4">
        {/* Notice Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-pup-200 bg-pup-50/60 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-pup-100 p-2.5 text-pup-800">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-pup-950 uppercase tracking-wide">
                Unified Vehicle Registration
              </div>
              <div className="text-xs text-pup-800">
                New vehicle passes are registered and updated directly within the{' '}
                <span className="font-bold">Student Directory</span>.
              </div>
            </div>
          </div>
          <Link
            href="/students"
            className="flex items-center gap-1.5 rounded-xl bg-pup-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition whitespace-nowrap"
          >
            <span>Open Student Directory</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
              <span>Total Passes</span>
              <Car className="h-4 w-4 text-pup-700" />
            </div>
            <div className="mt-1 text-2xl font-black text-slate-900">{vehicles.length}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
              <span>Motorcycles</span>
              <Bike className="h-4 w-4 text-sky-600" />
            </div>
            <div className="mt-1 text-2xl font-black text-sky-900">{motorcycleCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
              <span>Cars & Vans</span>
              <Car className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-1 text-2xl font-black text-amber-900">{carCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
              <span>Active Status</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-1 text-2xl font-black text-emerald-800">100%</div>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by license plate (e.g. ABC-1234) or owner name..."
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-pup-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              title="Refresh list"
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
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
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Classification</th>
                  <th className="px-4 py-3">ID Number</th>
                  <th className="px-4 py-3">Brand & Model</th>
                  <th className="px-4 py-3">Vehicle Type</th>
                  <th className="px-4 py-3">Color</th>
                  <th className="px-4 py-3">Barrier Pass Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
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
                        {v.student ? `${v.student.first_name} ${v.student.last_name}` : 'Unknown Owner'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                            v.student?.person_type === 'faculty'
                              ? 'bg-blue-100 text-blue-800'
                              : v.student?.person_type === 'visitor'
                              ? 'bg-amber-100 text-amber-800'
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
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/students?search=${encodeURIComponent(v.plate_number)}`}
                            title="Manage Profile in Student Directory"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-pup-700 transition"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteVehicle(v)}
                            title="Revoke Vehicle Pass"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-xs text-slate-400">
                      No registered vehicles match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
