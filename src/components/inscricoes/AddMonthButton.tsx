'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { MONTH_NAMES, MONTH_LABELS } from '@/lib/months';
import { createMonth } from '@/lib/data/registrations';

interface Props {
  existingMonths: Record<number, number[]>;
  onCreated: (month: string, year: number) => void;
}

export function AddMonthButton({ existingMonths, onCreated }: Props) {
  const currentYear = new Date().getFullYear();
  const [isOpen, setIsOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentYear);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) setPickerYear(currentYear);
  }, [isOpen, currentYear]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  async function handleMonthClick(monthIndex: number) {
    if (saving) return;
    setSaving(true);
    const result = await createMonth(pickerYear, monthIndex + 1);
    setSaving(false);
    if (result.success) {
      setIsOpen(false);
      onCreated(MONTH_NAMES[monthIndex], pickerYear);
    }
  }

  const existingForYear = existingMonths[pickerYear] ?? [];

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-10 h-10 flex items-center justify-center bg-surface-container-lowest border border-surface-container-highest rounded-full shadow-sm text-gray-500 hover:text-gray-900 transition-colors"
        aria-label="Adicionar mês"
      >
        <Plus size={16} weight="bold" />
      </button>

      {isOpen && (
        <div className="animate-dropdown-in absolute right-0 top-full mt-2 bg-white border border-[#ECEEEC] rounded-lg shadow-lg z-50 p-4 w-64">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setPickerYear((y) => Math.max(currentYear, y - 1))}
              disabled={pickerYear <= currentYear}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-500 hover:text-gray-900"
              aria-label="Ano anterior"
            >
              <CaretLeft size={14} weight="bold" />
            </button>
            <span className="text-body-md font-semibold text-gray-900">{pickerYear}</span>
            <button
              onClick={() => setPickerYear((y) => Math.min(currentYear + 1, y + 1))}
              disabled={pickerYear >= currentYear + 1}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-500 hover:text-gray-900"
              aria-label="Próximo ano"
            >
              <CaretRight size={14} weight="bold" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {MONTH_LABELS.map((label, idx) => {
              const isExisting = existingForYear.includes(idx + 1);
              return (
                <button
                  key={idx}
                  onClick={() => handleMonthClick(idx)}
                  disabled={isExisting || saving}
                  className={`py-2 px-1 rounded-lg text-label-md text-center transition-colors ${
                    isExisting
                      ? 'text-gray-400 opacity-40 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-surface-container'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
