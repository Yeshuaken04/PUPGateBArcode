'use client';

import React from 'react';
import { Menu, ShieldCheck, SquareActivity, Bell } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
  subtitle?: string;
  onOpenGateModal?: () => void;
}

export default function Header({
  onMenuClick,
  title,
  subtitle,
  onOpenGateModal,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md lg:px-6">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-black text-slate-900 lg:text-lg">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      {/* Right: Gate Status & Quick Controls */}
      <div className="flex items-center gap-2.5">
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Gate Controller Active</span>
        </div>

        {onOpenGateModal && (
          <button
            onClick={onOpenGateModal}
            className="flex items-center gap-1.5 rounded-xl bg-pup-700 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition"
          >
            <SquareActivity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Manual Gate Override</span>
            <span className="sm:hidden">Open</span>
          </button>
        )}

        <Link
          href="/live"
          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
          title="Live Scanner Preview"
        >
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
        </Link>
      </div>
    </header>
  );
}
