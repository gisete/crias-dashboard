'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRealtimeRegistrations } from '@/hooks/useRealtimeRegistrations';
import type { RegistrationWithDetails, RegistrationStatus } from '@/types/database';
import {
  fetchRegistrations,
  fetchMonthStats,
  fetchStatusCounts,
  fetchUnassignedRegistrations,
  getAvailableMonths,
  getAvailableYears,
  getLatestActiveMonth,
  type MonthStats,
  type StatusCounts,
} from '@/lib/data/registrations';
import { MONTH_NAMES } from '@/lib/months';
import { MonthSelector } from '@/components/inscricoes/MonthSelector';
import { StatCards } from '@/components/inscricoes/StatCards';
import { UnassignedRegistrations } from '@/components/inscricoes/UnassignedRegistrations';
import { StatusFilter } from '@/components/inscricoes/StatusFilter';
import { RegistrationsTable } from '@/components/inscricoes/RegistrationsTable';

type FilterKey = 'todos' | 'pendente' | 'a_pagar' | 'lembrete' | 'pago_confirmado' | 'cancelado';

const EMPTY_COUNTS: StatusCounts = {
  todos: 0, pendente: 0, a_pagar: 0, lembrete: 0, pago_confirmado: 0, cancelado: 0,
};

const EMPTY_STATS: MonthStats = {
  total: 0, pendentes: 0, pagos: 0, expectedRevenue: 0,
};

export default function InscricoesPage() {
  const [month, setMonth] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [registrations, setRegistrations] = useState<RegistrationWithDetails[]>([]);
  const [stats, setStats] = useState<MonthStats>(EMPTY_STATS);
  const [counts, setCounts] = useState<StatusCounts>(EMPTY_COUNTS);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [monthsByYear, setMonthsByYear] = useState<Record<number, number[]>>({});
  const [unassigned, setUnassigned] = useState<RegistrationWithDetails[]>([]);

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
    fetchUnassignedRegistrations().then(setUnassigned);
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
    fetchUnassignedRegistrations().then(setUnassigned);
    if (!month || !year) return;
    fetchRegistrations(month, year, activeFilter).then(setRegistrations);
    fetchMonthStats(month, year).then(setStats);
    fetchStatusCounts(month, year).then(setCounts);
  }, [month, year, activeFilter]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useRealtimeRegistrations(refetch);

  function handleToggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleUpdate(id: string, updates: Record<string, unknown>) {
    setRegistrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    );
  }

  function handleStatusChange(id: string, newStatus: RegistrationStatus) {
    setRegistrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)),
    );
    if (month && year) {
      fetchStatusCounts(month, year).then(setCounts);
      fetchMonthStats(month, year).then(setStats);
    }
  }

  function handleMonthChange(m: string, y: number) {
    setMonth(m);
    setYear(y);
    setExpandedId(null);
  }

  function handleFilterChange(f: FilterKey) {
    setActiveFilter(f);
    setExpandedId(null);
  }

  if (!month || !year) return null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 md:gap-4 mb-4 md:mb-12">
        <h1 className="text-headline-md md:text-headline-lg text-gray-900">Inscrições</h1>
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
        </div>
      </div>

      <StatCards stats={stats} />

      <UnassignedRegistrations
        registrations={unassigned}
        currentMonth={month}
        currentYear={year}
        monthsByYear={monthsByYear}
        onAssigned={refetch}
      />

      <StatusFilter active={activeFilter} counts={counts} onChange={handleFilterChange} />

      <RegistrationsTable
        registrations={registrations}
        expandedId={expandedId}
        onToggle={handleToggle}
        onUpdate={handleUpdate}
        onStatusChange={handleStatusChange}
      />
    </>
  );
}
