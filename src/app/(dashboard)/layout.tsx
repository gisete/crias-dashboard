'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { List, X, Bell, UserCircle } from '@phosphor-icons/react';
import { SidebarContent } from '@/components/layout/SidebarContent';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-on-primary-fixed text-white py-10 px-6 z-50">
        <SidebarContent onLogout={handleLogout} />
      </aside>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-on-primary-fixed text-white flex flex-col py-10 px-6">
          <button
            onClick={() => setMobileNavOpen(false)}
            aria-label="Fechar menu"
            className="absolute top-8 right-6 text-white w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={22} />
          </button>
          <SidebarContent
            onNavigate={() => setMobileNavOpen(false)}
            onLogout={() => {
              setMobileNavOpen(false);
              handleLogout();
            }}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-surface-container-lowest/80 backdrop-blur-md border-b border-surface-container-highest flex justify-between items-center w-full px-4 sm:px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label="Abrir menu"
              className="md:hidden -ml-2 text-gray-500 hover:text-gray-900 transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container"
            >
              <List size={22} />
            </button>
            <span className="md:hidden text-headline-md font-semibold text-gray-900">
              Crias na Floresta
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-gray-500 hover:text-gray-900 transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container">
              <Bell size={20} />
            </button>
            <button className="text-gray-500 hover:text-gray-900 transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container">
              <UserCircle size={20} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
