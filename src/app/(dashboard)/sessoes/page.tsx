'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRealtimeRegistrations } from '@/hooks/useRealtimeRegistrations';
import type { Session, SessionChild } from '@/types/sessions';
import { fetchSessionsByMonth } from '@/lib/data/sessions';
import {
  getAvailableMonths,
  getAvailableYears,
  getLatestActiveMonth,
} from '@/lib/data/registrations';
import { MONTH_NAMES } from '@/lib/months';
import { MonthSelector } from '@/components/inscricoes/MonthSelector';
import { AddMonthButton } from '@/components/inscricoes/AddMonthButton';
import { SessionSearch } from '@/components/sessoes/SessionSearch';
import { SessionFilters, type SlotFilter } from '@/components/sessoes/SessionFilters';
import { SessionCard } from '@/components/sessoes/SessionCard';

export default function SessoesPage() {
  const [month, setMonth] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [slotFilter, setSlotFilter] = useState<SlotFilter>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [monthsByYear, setMonthsByYear] = useState<Record<number, number[]>>({});

  useEffect(() => {
    getLatestActiveMonth().then((result) => {
      if (result) {
        setMonth(MONTH_NAMES[result.month - 1]);
        setYear(result.year);
      } else {
        const now = new Date();
        setMonth(MONTH_NAMES[now.getMonth()]);
        setYear(now.getFullYear());
      }
    });
  }, []);

  const refreshAvailableMonths = useCallback(async () => {
    const years = await getAvailableYears();
    setAvailableYears(years);
    const entries = await Promise.all(
      years.map(async (y) => [y, await getAvailableMonths(y)] as const),
    );
    setMonthsByYear(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    refreshAvailableMonths();
  }, [refreshAvailableMonths]);

  const refetch = useCallback(() => {
    if (!month || !year) return;
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

  if (!month || !year) return null;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
        <h1 className="text-headline-lg text-gray-900">Sessões</h1>
        <div className="flex items-center gap-2">
          <MonthSelector
            month={month}
            year={year}
            onChange={handleMonthChange}
            availableYears={availableYears.length > 0 ? availableYears : undefined}
            getAvailableMonths={
              availableYears.length > 0 ? (y) => monthsByYear[y] ?? [] : undefined
            }
          />
          <AddMonthButton
            existingMonths={monthsByYear}
            onCreated={(m, y) => {
              refreshAvailableMonths();
              handleMonthChange(m, y);
            }}
          />
        </div>
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
