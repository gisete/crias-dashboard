'use client';

import React, { useState, useMemo } from 'react';
import { ArrowsDownUp, ArrowUp, ArrowDown } from '@phosphor-icons/react';
import type { RegistrationWithDetails, RegistrationStatus } from '@/types/database';
import { RegistrationRow } from './RegistrationRow';
import { RegistrationDetail } from './RegistrationDetail';

type SortDir = 'default' | 'asc' | 'desc';
type OrderDir = 'asc' | 'desc';
type ActiveSort = 'order' | 'children';

interface Props {
  registrations: RegistrationWithDetails[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  onStatusChange: (id: string, newStatus: RegistrationStatus) => void;
}

const TH = 'py-3 md:py-5 px-3 md:px-6 text-label-sm text-gray-500 uppercase tracking-wider font-medium';

function childSortKey(reg: RegistrationWithDetails): string {
  return reg.children[0]?.name ?? '';
}

function nextSortDir(current: SortDir): SortDir {
  if (current === 'default') return 'asc';
  if (current === 'asc') return 'desc';
  return 'default';
}

export function RegistrationsTable({
  registrations,
  expandedId,
  onToggle,
  onUpdate,
  onStatusChange,
}: Props) {
  const [sortDir, setSortDir] = useState<SortDir>('default');
  const [orderDir, setOrderDir] = useState<OrderDir>('desc');
  const [activeSort, setActiveSort] = useState<ActiveSort>('order');

  const orderMap = useMemo(() => {
    const submittedTime = (reg: RegistrationWithDetails) =>
      new Date(reg.submitted_at ?? reg.created_at).getTime();
    const bySubmittedAt = [...registrations].sort((a, b) => submittedTime(a) - submittedTime(b));
    const map = new Map<string, number>();
    bySubmittedAt.forEach((reg, i) => map.set(reg.id, i + 1));
    return map;
  }, [registrations]);

  const sorted = useMemo(() => {
    if (activeSort === 'children' && sortDir !== 'default') {
      return [...registrations].sort((a, b) => {
        const cmp = childSortKey(a).localeCompare(childSortKey(b), 'pt');
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    if (activeSort === 'order') {
      return [...registrations].sort((a, b) => {
        const cmp = (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0);
        return orderDir === 'asc' ? cmp : -cmp;
      });
    }
    return registrations;
  }, [registrations, sortDir, activeSort, orderDir, orderMap]);

  if (registrations.length === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-16 text-center">
        <p className="text-body-lg text-gray-500">Nenhuma inscrição encontrada.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)] border border-surface-container-highest">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] table-fixed text-left border-collapse [font-variant-numeric:tabular-nums]">
          <thead>
            <tr className="border-b border-surface-container-highest bg-surface-container-low">
              <th
                className={`py-5 pl-6 pr-3 text-label-sm text-gray-500 uppercase tracking-wider font-medium w-[4%] cursor-pointer select-none hover:text-gray-700`}
                onClick={() => {
                  setActiveSort('order');
                  setOrderDir(orderDir === 'asc' ? 'desc' : 'asc');
                }}
              >
                <span className="inline-flex items-center gap-2">
                  #
                  {orderDir === 'asc' && <ArrowUp size={13} className="text-primary" />}
                  {orderDir === 'desc' && <ArrowDown size={13} className="text-primary" />}
                </span>
              </th>
              <th className={`${TH} w-[12%]`}>Estado</th>
              <th
                className={`${TH} w-[18%] cursor-pointer select-none hover:text-gray-700`}
                onClick={() => {
                  setActiveSort('children');
                  setSortDir(nextSortDir(sortDir));
                }}
              >
                <span className="inline-flex items-center gap-2">
                  Criança(s)
                  {sortDir === 'default' && (
                    <ArrowsDownUp size={13} className="text-on-surface-variant opacity-40" />
                  )}
                  {sortDir === 'asc' && <ArrowUp size={13} className="text-primary" />}
                  {sortDir === 'desc' && <ArrowDown size={13} className="text-primary" />}
                </span>
              </th>
              <th className={`${TH} w-[8%]`}>Idade</th>
              <th className={`${TH} w-[15%]`}>Responsável</th>
              <th className={`${TH} w-[17%]`}>Plano</th>
              <th className={`${TH} w-[8%]`}>Valor</th>
              <th className={`${TH} w-[5%]`}>F</th>
              <th className={`${TH} w-[5%]`}>V</th>
              <th className={`${TH} w-[8%]`} />
            </tr>
          </thead>
          <tbody className="text-body-md text-gray-900">
            {sorted.map((reg) => (
              <React.Fragment key={reg.id}>
                <RegistrationRow
                  registration={reg}
                  order={orderMap.get(reg.id) ?? 0}
                  isExpanded={expandedId === reg.id}
                  onToggle={() => onToggle(reg.id)}
                />
                {expandedId === reg.id && (
                  <RegistrationDetail
                    registration={reg}
                    onUpdate={onUpdate}
                    onStatusChange={onStatusChange}
                  />
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
