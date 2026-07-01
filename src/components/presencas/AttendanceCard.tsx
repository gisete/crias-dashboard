'use client';

import { Check, X } from '@phosphor-icons/react';
import { calculateAge } from '@/lib/age-calculator';
import type { AttendanceChild } from '@/lib/data/attendance';

interface Props {
  child: AttendanceChild;
  onMark: (sessionChildId: string, present: boolean | null) => void;
}

export function AttendanceCard({ child, onMark }: Props) {
  const { present } = child;

  function handlePresente() {
    onMark(child.sessionChildId, present === true ? null : true);
  }

  function handleFalta() {
    onMark(child.sessionChildId, present === false ? null : false);
  }

  const borderClass =
    present === true
      ? 'border-t border-r border-b border-l-4 border-surface-container-highest border-l-status-pago-text'
      : present === false
      ? 'border-t border-r border-b border-l-4 border-surface-container-highest border-l-error'
      : 'border border-surface-container-highest';

  return (
    <div className={`bg-white rounded-xl p-4 flex flex-col gap-3 ${borderClass}`}>
      <div className={present === false ? 'opacity-60' : ''}>
        <p className="text-body-md font-medium text-gray-900">{child.childName}</p>
        {child.dateOfBirth && (
          <p className="text-label-md text-gray-500">{calculateAge(child.dateOfBirth)}</p>
        )}
        <p className="text-label-md text-gray-400">{child.parentName}</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handlePresente}
          className={`flex-1 min-h-11 flex items-center justify-center gap-1.5 rounded-lg text-label-md transition-colors touch-manipulation select-none ${
            present === true
              ? 'bg-status-pago-bg text-status-pago-text'
              : 'border border-surface-container-highest text-gray-600 hover:bg-surface-container-low active:bg-surface-container'
          }`}
        >
          <Check size={16} weight="bold" />
          Presente
        </button>
        <button
          onClick={handleFalta}
          className={`flex-1 min-h-11 flex items-center justify-center gap-1.5 rounded-lg text-label-md transition-colors touch-manipulation select-none ${
            present === false
              ? 'bg-error-container/30 text-error'
              : 'border border-surface-container-highest text-gray-600 hover:bg-surface-container-low active:bg-surface-container'
          }`}
        >
          <X size={16} weight="bold" />
          Falta
        </button>
      </div>
    </div>
  );
}
