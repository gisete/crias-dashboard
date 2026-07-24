'use client';

import { useRef, useState, useEffect } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { MONTH_NAMES as MONTHS, MONTH_LABELS } from '@/lib/months';

const MIN_YEAR = 2025;
const MAX_YEAR = new Date().getFullYear() + 1;

interface Props {
  month: string;
  year: number;
  onChange: (month: string, year: number) => void;
  availableYears?: number[];
  getAvailableMonths?: (year: number) => number[];
}

export function MonthSelector({
  month,
  year,
  onChange,
  availableYears,
  getAvailableMonths,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);
  const containerRef = useRef<HTMLDivElement>(null);
  const idx = MONTHS.indexOf(month);

  const sortedYears = availableYears ? [...availableYears].sort((a, b) => a - b) : null;

  useEffect(() => {
    if (isOpen) setPickerYear(year);
  }, [isOpen, year]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // ── Pill arrow navigation ────────────────────────────────────────
  // When getAvailableMonths is provided, arrows jump to the nearest
  // available month (across years if needed) and disable at the edges.
  // When not provided, arrows step freely as before.

  function findPrevTarget(): { month: string; year: number } | null {
    if (!getAvailableMonths) {
      return idx === 0
        ? { month: MONTHS[11], year: year - 1 }
        : { month: MONTHS[idx - 1], year };
    }
    const cur = idx + 1; // 1-indexed current month
    const prevInYear = getAvailableMonths(year)
      .filter((m) => m < cur)
      .sort((a, b) => b - a);
    if (prevInYear.length > 0) return { month: MONTHS[prevInYear[0] - 1], year };
    const prevYear = sortedYears
      ? (sortedYears.indexOf(year) > 0 ? sortedYears[sortedYears.indexOf(year) - 1] : null)
      : year > MIN_YEAR ? year - 1 : null;
    if (prevYear === null) return null;
    const prevYearMonths = getAvailableMonths(prevYear).sort((a, b) => b - a);
    if (prevYearMonths.length === 0) return null;
    return { month: MONTHS[prevYearMonths[0] - 1], year: prevYear };
  }

  function findNextTarget(): { month: string; year: number } | null {
    if (!getAvailableMonths) {
      return idx === 11
        ? { month: MONTHS[0], year: year + 1 }
        : { month: MONTHS[idx + 1], year };
    }
    const cur = idx + 1;
    const nextInYear = getAvailableMonths(year)
      .filter((m) => m > cur)
      .sort((a, b) => a - b);
    if (nextInYear.length > 0) return { month: MONTHS[nextInYear[0] - 1], year };
    const nextYear = sortedYears
      ? (sortedYears.indexOf(year) < sortedYears.length - 1
          ? sortedYears[sortedYears.indexOf(year) + 1]
          : null)
      : year < MAX_YEAR ? year + 1 : null;
    if (nextYear === null) return null;
    const nextYearMonths = getAvailableMonths(nextYear).sort((a, b) => a - b);
    if (nextYearMonths.length === 0) return null;
    return { month: MONTHS[nextYearMonths[0] - 1], year: nextYear };
  }

  const prevTarget = findPrevTarget();
  const nextTarget = findNextTarget();

  function prev() {
    if (prevTarget) onChange(prevTarget.month, prevTarget.year);
  }

  function next() {
    if (nextTarget) onChange(nextTarget.month, nextTarget.year);
  }

  // ── Dropdown: year navigation ─────────────────────────────────────
  const pickerYearIdx = sortedYears ? sortedYears.indexOf(pickerYear) : -1;
  const canGoPrevYear = sortedYears ? pickerYearIdx > 0 : pickerYear > MIN_YEAR;
  const canGoNextYear = sortedYears
    ? pickerYearIdx < sortedYears.length - 1
    : pickerYear < MAX_YEAR;

  function prevPickerYear() {
    if (sortedYears) {
      if (pickerYearIdx > 0) setPickerYear(sortedYears[pickerYearIdx - 1]);
    } else {
      setPickerYear((y) => y - 1);
    }
  }

  function nextPickerYear() {
    if (sortedYears) {
      if (pickerYearIdx < sortedYears.length - 1) setPickerYear(sortedYears[pickerYearIdx + 1]);
    } else {
      setPickerYear((y) => y + 1);
    }
  }

  // ── Dropdown: month list ──────────────────────────────────────────
  function selectMonth(mIdx: number) {
    onChange(MONTHS[mIdx], pickerYear);
    setIsOpen(false);
  }

  const monthNumbers: number[] = getAvailableMonths
    ? getAvailableMonths(pickerYear)
    : MONTH_LABELS.map((_, i) => i + 1);

  const label = `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;

  return (
    <div ref={containerRef} className="relative">
      {/* ── Pill ── */}
      <div className="flex items-center justify-between gap-1 bg-on-primary-fixed border border-white/10 rounded-full p-1.5 md:p-2">
        <button
          onClick={prev}
          disabled={!prevTarget}
          className="text-white/50 hover:text-white transition-colors w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Mês anterior"
        >
          <CaretLeft size={14} weight="bold" />
        </button>
        <button
          onClick={() => setIsOpen((o) => !o)}
          className="flex-1 text-body-md font-medium px-2 text-white md:min-w-[120px] text-center hover:text-white/80 transition-colors whitespace-nowrap"
        >
          {label}
        </button>
        <button
          onClick={next}
          disabled={!nextTarget}
          className="text-white/50 hover:text-white transition-colors w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Próximo mês"
        >
          <CaretRight size={14} weight="bold" />
        </button>
      </div>

      {/* ── Dropdown ── */}
      {isOpen && (
        <div className="animate-dropdown-in absolute right-0 top-full mt-2 bg-white border border-[#ECEEEC] rounded-lg shadow-lg z-50 p-4 w-64">
          {/* Year row */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={prevPickerYear}
              disabled={!canGoPrevYear}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-500 hover:text-gray-900"
              aria-label="Ano anterior"
            >
              <CaretLeft size={14} weight="bold" />
            </button>
            <span className="text-body-md font-semibold text-gray-900">{pickerYear}</span>
            <button
              onClick={nextPickerYear}
              disabled={!canGoNextYear}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-500 hover:text-gray-900"
              aria-label="Próximo ano"
            >
              <CaretRight size={14} weight="bold" />
            </button>
          </div>

          {/* Month list */}
          {monthNumbers.length === 0 ? (
            <p className="text-center text-body-md text-gray-400 py-3">Sem dados</p>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {monthNumbers.map((mNum) => {
                const mIdx = mNum - 1;
                const isSelected = mIdx === idx && pickerYear === year;
                return (
                  <button
                    key={mNum}
                    onClick={() => selectMonth(mIdx)}
                    className={`py-2 px-1 rounded-lg text-label-md text-center transition-colors ${
                      isSelected
                        ? 'bg-on-primary-fixed text-white font-semibold'
                        : 'text-gray-700 hover:bg-surface-container'
                    }`}
                  >
                    {MONTH_LABELS[mIdx]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
