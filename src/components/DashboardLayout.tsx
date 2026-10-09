'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ManualOpenModal from '@/components/ManualOpenModal';
import { createClient } from '@/lib/supabase/client';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [userRole, setUserRole] = useState('admin');
  const [userFullName, setUserFullName] = useState('System Administrator');

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single();

          if (profile) {
            setUserFullName(profile.full_name || user.email || 'Gate Guard');
            setUserRole(profile.role || 'guard');
          } else {
            setUserFullName(user.email?.split('@')[0] || 'Administrator');
          }
        }
      } catch {
        // demo fallback
      }
    }
    loadUser();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={userRole}
        userFullName={userFullName}
      />

      <div className="lg:pl-72 flex min-h-screen flex-col">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
          subtitle={subtitle}
          onOpenGateModal={() => setGateModalOpen(true)}
        />

        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto">{children}</main>

        <ManualOpenModal
          isOpen={gateModalOpen}
          onClose={() => setGateModalOpen(false)}
        />
      </div>
    </div>
  );
}
