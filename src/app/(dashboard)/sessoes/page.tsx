'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRealtimeRegistrations } from '@/hooks/useRealtimeRegistrations';
import type { Session, SessionChild } from '@/types/sessions';
import { fetchSessionsByMonth, getAvailableMonths } from '@/lib/data/sessions';
import { MonthSelector } from '@/components/inscricoes/MonthSelector';
import { SessionSearch } from '@/components/sessoes/SessionSearch';
import { SessionFilters, type SlotFilter } from '@/components/sessoes/SessionFilters';
import { SessionCard } from '@/components/sessoes/SessionCard';

export default function SessoesPage() {
  const [month, setMonth] = useState('julho');
  const [year, setYear] = useState(2026);
  const [slotFilter, setSlotFilter] = useState<SlotFilter>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);

  const refetch = useCallback(() => {
    fetchSessionsByMonth(month, year).then(setSessions);
  }, [month, year]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useRealtimeRegistrations(refetch);

  function handleMonthChange(m: string, y: number) {
    setMonth(m);
    setYear(y);
    setSearchQuery('');
  }

  const visibleSessions = useMemo(() => {
    return sessions.filter((s) => {
      const confirmed = s.children.filter((c) => c.registrationStatus === 'pago_confirmado');
      if (confirmed.length === 0) return false;
      if (slotFilter !== 'todas' && s.slot !== slotFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return confirmed.some((c) => c.childName.toLowerCase().includes(q));
      }
      return true;
    });
  }, [sessions, slotFilter, searchQuery]);

  function getDisplayChildren(session: Session): SessionChild[] {
    const confirmed = session.children.filter(
      (c) => c.registrationStatus === 'pago_confirmado',
    );
    if (!searchQuery.trim()) return confirmed;
    const q = searchQuery.toLowerCase().trim();
    return confirmed.filter((c) => c.childName.toLowerCase().includes(q));
  }

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-headline-lg text-gray-900">Sessões</h1>
        <MonthSelector
          month={month}
          year={year}
          onChange={handleMonthChange}
          availableYears={[2026]}
          getAvailableMonths={getAvailableMonths}
        />
      </div>

      <div className="flex flex-col gap-4 mb-8">
        <SessionSearch value={searchQuery} onChange={setSearchQuery} />
        <SessionFilters active={slotFilter} onChange={setSlotFilter} />
      </div>

      {visibleSessions.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-16 text-center">
          <p className="text-body-lg text-gray-500">Nenhuma sessão encontrada.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visibleSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              displayChildren={getDisplayChildren(session)}
            />
          ))}
        </div>
      )}
    </>
  );
}
