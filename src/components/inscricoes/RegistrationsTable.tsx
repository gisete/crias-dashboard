'use client';

import React, { useState, useMemo } from 'react';
import { ArrowsDownUp, ArrowUp, ArrowDown } from '@phosphor-icons/react';
import type { RegistrationWithDetails, RegistrationStatus } from '@/types/database';
import { RegistrationRow } from './RegistrationRow';
import { RegistrationDetail } from './RegistrationDetail';

type SortDir = 'default' | 'asc' | 'desc';

interface Props {
  registrations: RegistrationWithDetails[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  onStatusChange: (id: string, newStatus: RegistrationStatus) => void;
}

const TH = 'py-5 px-6 text-label-sm text-gray-500 uppercase tracking-wider font-medium';

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

  const sorted = useMemo(() => {
    if (sortDir === 'default') return registrations;
    return [...registrations].sort((a, b) => {
      const cmp = childSortKey(a).localeCompare(childSortKey(b), 'pt');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [registrations, sortDir]);

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
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-surface-container-highest bg-surface-container-low">
              <th className={TH}>Estado</th>
              <th
                className={`${TH} cursor-pointer select-none hover:text-gray-700`}
                onClick={() => setSortDir(nextSortDir(sortDir))}
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
              <th className={TH}>Idade</th>
              <th className={TH}>Responsável</th>
              <th className={TH}>Plano</th>
              <th className={TH}>Valor</th>
              <th className={TH}>Fatura</th>
              <th className={TH}>Voucher</th>
              <th className={`${TH} w-10`} />
            </tr>
          </thead>
          <tbody className="text-body-md text-gray-900">
            {sorted.map((reg) => (
              <React.Fragment key={reg.id}>
                <RegistrationRow
                  registration={reg}
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
