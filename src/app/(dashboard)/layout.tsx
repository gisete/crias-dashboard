'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ClipboardText,
  CalendarCheck,
  CalendarDots,
  UserCheck,
  SignOut,
  Bell,
  UserCircle,
} from '@phosphor-icons/react';
import { PendingCounter } from '@/components/layout/PendingCounter';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-on-primary-fixed text-white py-10 px-6 z-50">
        <div className="mb-12 flex flex-col items-start gap-1">
          <span className="text-headline-md font-semibold text-white">Crias na Floresta</span>
          <span className="text-label-md text-gray-300">Gestão Escolar</span>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          <Link
            href="/inscricoes"
            className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
              pathname === '/inscricoes'
                ? 'bg-white/10 text-white font-bold'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            <ClipboardText size={20} weight={pathname === '/inscricoes' ? 'fill' : 'regular'} />
            <span className="text-body-md">Inscrições</span>
          </Link>

          <Link
            href="/sessoes"
            className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
              pathname === '/sessoes'
                ? 'bg-white/10 text-white font-bold'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            <CalendarCheck size={20} weight={pathname === '/sessoes' ? 'fill' : 'regular'} />
            <span className="text-body-md">Sessões</span>
          </Link>

          <Link
            href="/meses"
            className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
              pathname.startsWith('/meses')
                ? 'bg-white/10 text-white font-bold'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            <CalendarDots size={20} weight={pathname.startsWith('/meses') ? 'fill' : 'regular'} />
            <span className="text-body-md">Meses</span>
          </Link>

          <Link
            href="/presencas"
            className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
              pathname.startsWith('/presencas')
                ? 'bg-white/10 text-white font-bold'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            <UserCheck size={20} weight={pathname.startsWith('/presencas') ? 'fill' : 'regular'} />
            <span className="text-body-md">Presenças</span>
          </Link>

          <div className="mt-8 pt-8 border-t border-white/10">
            <PendingCounter />
          </div>
        </nav>

        <div className="mt-auto pt-8 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 p-3 text-gray-300 hover:bg-white/5 rounded-lg transition-colors w-full text-left"
          >
            <SignOut size={20} />
            <span className="text-body-md">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-surface-container-lowest/80 backdrop-blur-md border-b border-surface-container-highest flex justify-between items-center w-full px-8 py-4">
          <div className="flex items-center gap-4">
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

        <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
