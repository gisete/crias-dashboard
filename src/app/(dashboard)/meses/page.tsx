'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAllMonths, type MonthWithCount } from '@/lib/data/months';
import { AddMonthButton } from '@/components/inscricoes/AddMonthButton';
import { MonthRow } from '@/components/meses/MonthRow';

export default function MesesPage() {
  const [months, setMonths] = useState<MonthWithCount[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refetch = useCallback(() => {
    fetchAllMonths().then((data) => {
      setMonths(data);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const existingMonths = useMemo(() => {
    const map: Record<number, number[]> = {};
    for (const m of months) {
      (map[m.year] ??= []).push(m.month);
    }
    return map;
  }, [months]);

  const yearGroups = useMemo(() => {
    const map = new Map<number, MonthWithCount[]>();
    for (const m of months) {
      if (!map.has(m.year)) map.set(m.year, []);
      map.get(m.year)!.push(m);
    }
    return [...map.entries()];
  }, [months]);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8 sm:mb-12">
        <h1 className="text-headline-md md:text-headline-lg text-gray-900">Meses</h1>
        <AddMonthButton existingMonths={existingMonths} onCreated={refetch} />
      </div>

      {!loaded ? null : months.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-16 text-center">
          <p className="text-body-lg text-gray-500">Nenhum mês criado.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {yearGroups.map(([year, yearMonths]) => (
            <div key={year} className="flex flex-col gap-4">
              <h2 className="text-title-lg text-gray-500">{year}</h2>
              {yearMonths.map((m) => (
                <MonthRow key={m.id} month={m} onChanged={refetch} />
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
