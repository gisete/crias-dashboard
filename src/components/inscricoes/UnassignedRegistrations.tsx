'use client';

import { useEffect, useRef, useState } from 'react';
import { Warning } from '@phosphor-icons/react';
import type { RegistrationWithDetails } from '@/types/database';
import { assignRegistrationMonth } from '@/lib/data/registrations';
import { MONTH_NAMES, MONTH_LABELS } from '@/lib/months';

interface Props {
  registrations: RegistrationWithDetails[];
  currentMonth: string;
  currentYear: number;
  monthsByYear: Record<number, number[]>;
  onAssigned: () => void;
}

export function UnassignedRegistrations({
  registrations,
  currentMonth,
  currentYear,
  monthsByYear,
  onAssigned,
}: Props) {
  if (registrations.length === 0) return null;

  const currentMonthLabel = MONTH_LABELS[MONTH_NAMES.indexOf(currentMonth)];

  return (
    <div
      className="mb-8 rounded-xl"
      style={{ backgroundColor: '#FFFBF0', border: '1px solid #F0C775', padding: '16px 20px' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Warning size={18} weight="fill" style={{ color: '#BA7517' }} />
        <span className="text-body-md" style={{ fontWeight: 600, color: '#854F0B' }}>
          Inscrições sem mês atribuído
        </span>
        <span
          className="inline-flex items-center px-2 rounded-full text-label-md"
          style={{ backgroundColor: '#F0C775', color: '#633806' }}
        >
          {registrations.length}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {registrations.map((reg) => (
          <UnassignedRow
            key={reg.id}
            registration={reg}
            currentMonth={currentMonth}
            currentMonthLabel={currentMonthLabel}
            currentYear={currentYear}
            monthsByYear={monthsByYear}
            onAssigned={onAssigned}
          />
        ))}
      </div>
    </div>
  );
}

interface RowProps {
  registration: RegistrationWithDetails;
  currentMonth: string;
  currentMonthLabel: string;
  currentYear: number;
  monthsByYear: Record<number, number[]>;
  onAssigned: () => void;
}

function UnassignedRow({
  registration: reg,
  currentMonth,
  currentMonthLabel,
  currentYear,
  monthsByYear,
  onAssigned,
}: RowProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!popoverOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [popoverOpen]);

  const childrenNames = reg.children.map((c) => c.name).join(', ');

  async function handleConfirmCurrent() {
    await assignRegistrationMonth(reg.id, currentMonth, currentYear);
    onAssigned();
  }

  async function handleAssignOther(monthNum: number, year: number) {
    await assignRegistrationMonth(reg.id, MONTH_NAMES[monthNum - 1], year);
    setPopoverOpen(false);
    onAssigned();
  }

  const years = Object.keys(monthsByYear)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div
      className="flex items-center justify-between gap-4 rounded-lg bg-white"
      style={{ border: '0.5px solid #ECEEEC', padding: '12px 16px' }}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-md min-w-0">
        <span className="font-medium text-gray-900">{reg.family.parent_name}</span>
        <span className="text-gray-300">·</span>
        <span className="text-gray-600">{childrenNames}</span>
        <span className="text-gray-300">·</span>
        <span className="text-gray-400">{reg.family.email}</span>
      </div>

      <div ref={containerRef} className="relative flex items-center gap-2 shrink-0">
        <button
          onClick={handleConfirmCurrent}
          className="rounded-md px-3 py-1.5 text-label-md text-white whitespace-nowrap"
          style={{ backgroundColor: '#002114' }}
        >
          Confirmar {currentMonthLabel}
        </button>
        <button
          onClick={() => setPopoverOpen((o) => !o)}
          className="rounded-md px-3 py-1.5 text-label-md whitespace-nowrap"
          style={{ border: '0.5px solid #ccc', color: '#444', backgroundColor: 'transparent' }}
        >
          Outro
        </button>

        {popoverOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-surface-container-highest rounded-lg shadow-lg z-10 py-1 max-h-64 overflow-y-auto">
            {years.map((y) => (
              <div key={y}>
                <div className="px-3 py-1 text-label-sm text-gray-400 uppercase tracking-wider">
                  {y}
                </div>
                {(monthsByYear[y] ?? []).map((monthNum) => (
                  <button
                    key={monthNum}
                    onClick={() => handleAssignOther(monthNum, y)}
                    className="w-full text-left px-3 py-2 text-body-md text-gray-900 hover:bg-surface-container-low transition-colors"
                  >
                    {MONTH_LABELS[monthNum - 1]} {y}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
