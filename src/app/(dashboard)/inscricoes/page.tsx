'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRealtimeRegistrations } from '@/hooks/useRealtimeRegistrations';
import type { RegistrationWithDetails, RegistrationStatus } from '@/types/database';
import {
  fetchRegistrations,
  fetchMonthStats,
  fetchStatusCounts,
  getAvailableMonths,
  getAvailableYears,
  type MonthStats,
  type StatusCounts,
} from '@/lib/data/registrations';
import { MonthSelector } from '@/components/inscricoes/MonthSelector';
import { StatCards } from '@/components/inscricoes/StatCards';
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
  const [month, setMonth] = useState('julho');
  const [year, setYear] = useState(2026);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [registrations, setRegistrations] = useState<RegistrationWithDetails[]>([]);
  const [stats, setStats] = useState<MonthStats>(EMPTY_STATS);
  const [counts, setCounts] = useState<StatusCounts>(EMPTY_COUNTS);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [monthsByYear, setMonthsByYear] = useState<Record<number, number[]>>({});

  useEffect(() => {
    getAvailableYears().then(async (years) => {
      setAvailableYears(years);
      const entries = await Promise.all(
        years.map(async (y) => [y, await getAvailableMonths(y)] as const)
      );
      setMonthsByYear(Object.fromEntries(entries));
    });
  }, []);

  const refetch = useCallback(() => {
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
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }

  function handleStatusChange(id: string, newStatus: RegistrationStatus) {
    setRegistrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    // Optimistically update counts
    fetchStatusCounts(month, year).then(setCounts);
    fetchMonthStats(month, year).then(setStats);
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

  return (
    <>
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-headline-lg text-gray-900">Inscrições</h1>
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

      <StatCards stats={stats} />

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
