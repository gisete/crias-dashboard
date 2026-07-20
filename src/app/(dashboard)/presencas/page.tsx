'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  getAvailableMonths,
  getAvailableYears,
  getCurrentActiveMonth,
  getLatestActiveMonth,
} from '@/lib/data/registrations';
import { MONTH_NAMES, MONTH_TO_NUMBER } from '@/lib/months';
import { MonthSelector } from '@/components/inscricoes/MonthSelector';
import { AttendanceCard } from '@/components/presencas/AttendanceCard';
import {
  fetchSessionDates,
  fetchAttendanceByDate,
  markAttendance,
  type SessionDate,
  type AttendanceSession,
  type AttendanceChild,
} from '@/lib/data/attendance';
import { Camera, CaretDown, CaretUp } from '@phosphor-icons/react';
import { SLOT_PILL, SLOT_LABEL } from '@/lib/slot-utils';
import { getTodayLisbon } from '@/lib/date-utils';

// Unmarked children first, marked (present or absent) children last, each
// group keeping the original fetch order — so marking a child slides it
// down instead of reshuffling by "most recently marked".
function sortByMarkedLast(children: AttendanceChild[]): AttendanceChild[] {
  return children
    .map((child, index) => ({ child, index }))
    .sort((a, b) => {
      const aMarked = a.child.present !== null && a.child.present !== undefined;
      const bMarked = b.child.present !== null && b.child.present !== undefined;
      if (aMarked !== bMarked) return aMarked ? 1 : -1;
      return a.index - b.index;
    })
    .map(({ child }) => child);
}

// FLIP animation: on every render where `order` changes, slide each card
// from its previous position to its new one instead of teleporting.
function useFlipAnimation(order: string[]) {
  const elementsRef = useRef(new Map<string, HTMLDivElement>());
  const rectsRef = useRef(new Map<string, DOMRect>());

  useLayoutEffect(() => {
    const prevRects = rectsRef.current;
    const nextRects = new Map<string, DOMRect>();

    elementsRef.current.forEach((el, key) => {
      nextRects.set(key, el.getBoundingClientRect());
    });

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
      elementsRef.current.forEach((el, key) => {
        const prev = prevRects.get(key);
        const next = nextRects.get(key);
        if (!prev || !next) return;

        const dx = prev.left - next.left;
        const dy = prev.top - next.top;
        if (dx === 0 && dy === 0) return;

        el.style.transition = 'none';
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        el.getBoundingClientRect();
        requestAnimationFrame(() => {
          el.style.transition = 'transform 300ms ease-in-out';
          el.style.transform = '';
        });
      });
    }

    rectsRef.current = nextRects;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.join('|')]);

  return useCallback(
    (key: string) => (el: HTMLDivElement | null) => {
      if (el) elementsRef.current.set(key, el);
      else elementsRef.current.delete(key);
    },
    [],
  );
}

interface SlotGridProps {
  sessionChildren: AttendanceChild[];
  onMark: (sessionChildId: string, present: boolean | null) => void;
}

function SlotGrid({ sessionChildren, onMark }: SlotGridProps) {
  const sorted = useMemo(() => sortByMarkedLast(sessionChildren), [sessionChildren]);
  const registerRef = useFlipAnimation(sorted.map((c) => c.sessionChildId));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {sorted.map((child) => (
        <AttendanceCard
          key={child.sessionChildId}
          ref={registerRef(child.sessionChildId)}
          child={child}
          onMark={onMark}
        />
      ))}
    </div>
  );
}

function pickDefaultDate(dates: SessionDate[], month: string, year: number): string | null {
  if (dates.length === 0) return null;

  const [todayYear, todayMonth, todayDay] = getTodayLisbon().split('-').map(Number);
  const isCurrentMonth = MONTH_TO_NUMBER[month] === todayMonth && year === todayYear;

  if (!isCurrentMonth) return dates[0].date;

  const exact = dates.find((d) => parseInt(d.date, 10) === todayDay);
  if (exact) return exact.date;

  const next = dates.find((d) => parseInt(d.date, 10) > todayDay);
  if (next) return next.date;

  return dates[dates.length - 1].date;
}

// Same today-detection approach as pickDefaultDate's "exact" check, applied
// to an already-selected date instead of picking one.
function isTodaySelected(selectedDate: string, month: string, year: number): boolean {
  const [todayYear, todayMonth, todayDay] = getTodayLisbon().split('-').map(Number);
  return (
    MONTH_TO_NUMBER[month] === todayMonth &&
    year === todayYear &&
    parseInt(selectedDate, 10) === todayDay
  );
}

// Current hour in Lisbon (0-23), consistent with getTodayLisbon's use of
// Intl.DateTimeFormat + formatToParts for timezone-safe reads.
function getCurrentHourLisbon(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  return parseInt(parts.find((p) => p.type === 'hour')!.value, 10);
}

// All sections start expanded, except: on today, from 13:00 onward, morning
// (manhã) sections default to collapsed since they're already over.
function computeDefaultExpandedSlots(
  sessions: AttendanceSession[],
  selectedDate: string | null,
  month: string,
  year: number,
): Set<string> {
  const allIds = sessions.map((s) => s.sessionId);

  if (!selectedDate || !isTodaySelected(selectedDate, month, year) || getCurrentHourLisbon() < 13) {
    return new Set(allIds);
  }

  return new Set(sessions.filter((s) => s.slot !== 'manhã').map((s) => s.sessionId));
}

export default function PresencasPage() {
  const [month, setMonth] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [monthsByYear, setMonthsByYear] = useState<Record<number, number[]>>({});
  const [sessionDates, setSessionDates] = useState<SessionDate[]>([]);
  const [datesLoaded, setDatesLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [photosOnly, setPhotosOnly] = useState(false);
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());
  const chipsRef = useRef<HTMLDivElement>(null);

  // Keep the selected date chip visible in the horizontal strip — on mobile
  // the default date (e.g. today, late in the month) is often off-screen.
  useEffect(() => {
    if (!selectedDate || !chipsRef.current) return;
    chipsRef.current
      .querySelector<HTMLElement>(`[data-date="${CSS.escape(selectedDate)}"]`)
      ?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [selectedDate, sessionDates]);

  useEffect(() => {
    setPhotosOnly(false);
  }, [selectedDate]);

  useEffect(() => {
    async function loadDefaultMonth() {
      const current = await getCurrentActiveMonth();
      if (current) {
        setMonth(MONTH_NAMES[current.month - 1]);
        setYear(current.year);
        return;
      }
      const latest = await getLatestActiveMonth();
      if (latest) {
        setMonth(MONTH_NAMES[latest.month - 1]);
        setYear(latest.year);
        return;
      }
      const now = new Date();
      setMonth(MONTH_NAMES[now.getMonth()]);
      setYear(now.getFullYear());
    }
    loadDefaultMonth();
  }, []);

  const refreshAvailableMonths = useCallback(async () => {
    const years = await getAvailableYears();
    setAvailableYears(years);
    const entries = await Promise.all(
      years.map(async (y) => [y, await getAvailableMonths(y)] as const),
    );
    setMonthsByYear(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    refreshAvailableMonths();
  }, [refreshAvailableMonths]);

  const loadSessionDates = useCallback(async () => {
    if (!month || year === null) return;
    setDatesLoaded(false);
    const dates = await fetchSessionDates(month, year);
    setSessionDates(dates);
    setSelectedDate(pickDefaultDate(dates, month, year));
    setDatesLoaded(true);
  }, [month, year]);

  useEffect(() => {
    loadSessionDates();
  }, [loadSessionDates]);

  const loadAttendance = useCallback(async () => {
    if (!month || year === null || !selectedDate) {
      setSessions([]);
      setExpandedSlots(new Set());
      return;
    }
    const result = await fetchAttendanceByDate(selectedDate, month, year);
    setSessions(result);
    setExpandedSlots(computeDefaultExpandedSlots(result, selectedDate, month, year));
  }, [month, year, selectedDate]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  function handleMonthChange(m: string, y: number) {
    setMonth(m);
    setYear(y);
  }

  function toggleSlot(sessionId: string) {
    setExpandedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }

  async function handleMark(sessionChildId: string, present: boolean | null) {
    const prevSessions = sessions;
    setSessions((prev) =>
      prev.map((s) => ({
        ...s,
        children: s.children.map((c) =>
          c.sessionChildId === sessionChildId ? { ...c, present } : c,
        ),
      })),
    );
    const result = await markAttendance(sessionChildId, present);
    if (!result.success) {
      setSessions(prevSessions);
    }
  }

  const totalPhotoCount = useMemo(
    () => sessions.reduce((sum, s) => sum + s.children.filter((c) => c.hasPhotos).length, 0),
    [sessions],
  );

  if (!month || year === null) return null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 md:gap-4 mb-5 md:mb-8">
        <h1 className="text-headline-md md:text-headline-lg text-gray-900">Presenças</h1>
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

      {!datesLoaded ? null : sessionDates.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-16 text-center">
          <p className="text-body-lg text-gray-500">Nenhuma sessão neste mês.</p>
        </div>
      ) : (
        <>
          <div
            ref={chipsRef}
            className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none"
          >
            {sessionDates.map((d) => (
              <button
                key={d.date}
                data-date={d.date}
                onClick={() => setSelectedDate(d.date)}
                className={`shrink-0 min-h-11 px-4 py-2.5 rounded-xl text-label-md whitespace-nowrap transition-colors touch-manipulation select-none ${
                  selectedDate === d.date
                    ? 'bg-on-primary-fixed text-white'
                    : 'bg-surface-container-lowest border border-surface-container-highest text-gray-600 hover:bg-surface-container-low active:bg-surface-container'
                }`}
              >
                {d.date} {d.dayOfWeek}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <button
              onClick={() => setPhotosOnly((v) => !v)}
              className={`min-h-10 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors touch-manipulation select-none ${
                photosOnly
                  ? 'bg-on-primary-fixed text-white'
                  : 'bg-white border border-surface-container-highest text-gray-600 hover:bg-surface-container-low active:bg-surface-container'
              }`}
            >
              <Camera size={17} />
              Só fotos
              <span
                className={`text-[14px] px-1.5 py-0.5 rounded-full ${
                  photosOnly ? 'bg-white/20 text-white' : 'bg-surface-container text-gray-500'
                }`}
              >
                {totalPhotoCount}
              </span>
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="mt-6 bg-surface-container-lowest rounded-xl border border-surface-container-highest p-16 text-center">
              <p className="text-body-lg text-gray-500">Nenhuma sessão neste dia.</p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-10">
              {sessions.map((session) => {
                const presentCount = session.children.filter((c) => c.present === true).length;
                const visibleChildren = photosOnly
                  ? session.children.filter((c) => c.hasPhotos)
                  : session.children;
                const isExpanded = expandedSlots.has(session.sessionId);
                return (
                  <div key={session.sessionId}>
                    <button
                      onClick={() => toggleSlot(session.sessionId)}
                      className="flex items-center gap-4 mb-4 w-full text-left cursor-pointer"
                    >
                      <span className={`px-3 py-1 rounded-full text-label-md ${SLOT_PILL[session.slot]}`}>
                        {SLOT_LABEL[session.slot]}
                      </span>
                      <span className="text-body-md text-gray-500">
                        {presentCount}/{session.children.length} presentes
                      </span>
                      {isExpanded ? (
                        <CaretUp size={14} className="text-gray-400 ml-auto" />
                      ) : (
                        <CaretDown size={14} className="text-gray-400 ml-auto" />
                      )}
                    </button>
                    {isExpanded &&
                      (photosOnly && visibleChildren.length === 0 ? (
                        <p className="text-body-md text-gray-400">Nenhuma criança com registos fotográficos</p>
                      ) : (
                        <SlotGrid sessionChildren={visibleChildren} onMark={handleMark} />
                      ))}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
