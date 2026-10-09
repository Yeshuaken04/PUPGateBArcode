'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Car,
  LogIn,
  LogOut,
  Camera,
  SquareActivity,
  BarChart3,
  UserCog,
  Settings,
  X,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  userRole?: string;
  userFullName?: string;
}

export default function Sidebar({
  open,
  onClose,
  userRole = 'admin',
  userFullName = 'Administrator',
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'faculty', 'guard', 'viewer'] },
    { label: 'Live Scanner', href: '/live', icon: Camera, roles: ['super_admin', 'admin', 'guard'] },
    { label: 'Student Directory', href: '/students', icon: Users, roles: ['super_admin', 'admin', 'faculty', 'guard', 'viewer'] },
    { label: 'Student Vehicles', href: '/vehicles', icon: Car, roles: ['super_admin', 'admin', 'faculty', 'guard', 'viewer'] },
    { label: 'Entry Logs', href: '/access-logs?mode=entry', icon: LogIn, roles: ['super_admin', 'admin', 'faculty', 'guard', 'viewer'] },
    { label: 'Exit Logs', href: '/access-logs?mode=exit', icon: LogOut, roles: ['super_admin', 'admin', 'faculty', 'guard', 'viewer'] },
    { label: 'Gate Barrier Control', href: '/gates', icon: SquareActivity, roles: ['super_admin', 'admin', 'guard'] },
    { label: 'Reports & Analytics', href: '/reports', icon: BarChart3, roles: ['super_admin', 'admin', 'faculty', 'viewer'] },
    { label: 'Users & Roles', href: '/users', icon: UserCog, roles: ['super_admin', 'admin'] },
    { label: 'System Settings', href: '/settings', icon: Settings, roles: ['super_admin', 'admin'] },
  ];

  const filteredNav = navItems.filter((item) => item.roles.includes(userRole));

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      document.cookie = 'pup_gate_demo_session=; path=/; max-age=0;';
    } catch {
      // ignore
    } finally {
      router.push('/login');
    }
  };

  const isActive = (href: string) => {
    const basePath = href.split('?')[0];
    if (href.includes('mode=entry')) {
      return pathname.startsWith('/access-logs') && typeof window !== 'undefined' && window.location.search.includes('mode=entry');
    }
    if (href.includes('mode=exit')) {
      return pathname.startsWith('/access-logs') && typeof window !== 'undefined' && window.location.search.includes('mode=exit');
    }
    return pathname === basePath;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-pup-800 text-white shadow-2xl transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-pup-700/60 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1 shadow-md">
              <img src="/logo200.svg" alt="PUP Logo" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <div className="text-base font-black tracking-wide text-white">PUP BATAAN</div>
              <div className="text-[11px] font-medium text-amber-300">Automated Gate System</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-pup-200 hover:bg-pup-700 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-pup-300">
            Navigation Menu
          </div>
          {filteredNav.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  active
                    ? 'bg-white text-pup-800 shadow-sm'
                    : 'text-pup-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-pup-800' : 'text-pup-200'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout Footer */}
        <div className="border-t border-pup-700/60 p-4">
          <div className="flex items-center justify-between rounded-xl bg-black/20 p-3">
            <div className="min-w-0">
              <div className="truncate text-xs font-bold text-white">{userFullName}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center rounded-md bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
                  {userRole}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="rounded-lg p-2 text-pup-200 hover:bg-white/10 hover:text-white transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
