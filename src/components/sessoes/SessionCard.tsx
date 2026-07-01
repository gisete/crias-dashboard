'use client';

import { useState } from 'react';
import { CalendarBlank, CaretDown } from '@phosphor-icons/react';
import type { Session, SessionChild } from '@/types/sessions';
import { SLOT_PILL, SLOT_LABEL } from '@/lib/slot-utils';
import { SessionTable } from './SessionTable';

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function formatSessionDate(isoDate: string): string {
  const date = new Date(isoDate + 'T12:00:00');
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;
}

interface Props {
  session: Session;
  displayChildren: SessionChild[];
}

export function SessionCard({ session, displayChildren }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const confirmedCount = session.children.filter(
    (c) => c.registrationStatus === 'pago_confirmado',
  ).length;
  const childrenLabel = confirmedCount === 1 ? '1 criança' : `${confirmedCount} crianças`;

  return (
    <div className="bg-white rounded-xl border border-surface-container-highest shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 sm:px-6 py-5 hover:bg-surface-container-low transition-colors text-left touch-manipulation"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <CalendarBlank size={18} className="text-gray-400 shrink-0 hidden sm:block" />
          <span className="text-body-md font-medium text-gray-900 truncate">
            {formatSessionDate(session.date)}
          </span>
          <span className={`px-3 py-1 rounded-full text-label-md shrink-0 ${SLOT_PILL[session.slot]}`}>
            {SLOT_LABEL[session.slot]}
          </span>
        </div>
        <div className="flex items-center gap-3 sm:gap-5 shrink-0 ml-3 sm:ml-6">
          <span className="text-body-md text-gray-500 font-normal whitespace-nowrap">
            {childrenLabel}
          </span>
          <CaretDown
            size={16}
            weight="bold"
            className={`text-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-surface-container-highest">
          <SessionTable children={displayChildren} />
        </div>
      )}
    </div>
  );
}
