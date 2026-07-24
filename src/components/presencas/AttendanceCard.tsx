'use client';

import { forwardRef } from 'react';
import { Camera, Check, X } from '@phosphor-icons/react';
import { calculateAge } from '@/lib/age-calculator';
import { shortenName } from '@/lib/name-utils';
import { formatSessionValue } from '@/lib/plan-display';
import { ConsentIcon } from '@/components/sessoes/ConsentIcon';
import type { AttendanceChild } from '@/lib/data/attendance';

interface Props {
  child: AttendanceChild;
  onMark: (sessionChildId: string, present: boolean | null) => void;
}

export const AttendanceCard = forwardRef<HTMLDivElement, Props>(function AttendanceCard(
  { child, onMark },
  ref,
) {
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
    <div ref={ref} className={`bg-white rounded-xl p-4 flex flex-col h-full ${borderClass}`}>
      <div className={present === false ? 'opacity-60' : ''}>
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <p className="text-body-lg font-medium text-gray-900">{shortenName(child.childName)}</p>
            <p className="text-body-md text-gray-500">{shortenName(child.parentName)}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {child.dateOfBirth && (
              <p className="text-body-md text-gray-500 whitespace-nowrap">{calculateAge(child.dateOfBirth)}</p>
            )}
            <div className="flex items-center gap-1.5">
              <ConsentIcon consent={child.imageConsent} />
              {child.hasPhotos && (
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                  <Camera size={14} weight="bold" className="text-blue-600" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-surface-container-highest mt-2.5 pt-2.5">
          <span className="text-body-md text-gray-500">{formatSessionValue(child.perSessionValue)} / sessão</span>
          <span className="text-body-md px-2.5 py-0.5 rounded-full whitespace-nowrap bg-surface-container text-gray-600">
            {child.isPack ? 'Pack mensal' : 'Avulso'}
          </span>
        </div>
      </div>

      <div className="flex gap-2 mt-auto pt-3">
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
});
