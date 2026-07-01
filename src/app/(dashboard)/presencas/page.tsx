'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getAvailableMonths,
  getAvailableYears,
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
} from '@/lib/data/attendance';
import { SLOT_PILL, SLOT_LABEL } from '@/lib/slot-utils';

function pickDefaultDate(dates: SessionDate[], month: string, year: number): string | null {
  if (dates.length === 0) return null;

  const now = new Date();
  const isCurrentMonth = MONTH_TO_NUMBER[month] === now.getMonth() + 1 && year === now.getFullYear();

  if (!isCurrentMonth) return dates[0].date;

  const todayDay = now.getDate();
  const exact = dates.find((d) => parseInt(d.date, 10) === todayDay);
  if (exact) return exact.date;

  let nearest = dates[0];
  let minDiff = Math.abs(parseInt(dates[0].date, 10) - todayDay);
  for (const d of dates.slice(1)) {
    const diff = Math.abs(parseInt(d.date, 10) - todayDay);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = d;
    }
  }
  return nearest.date;
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

  useEffect(() => {
    getLatestActiveMonth().then((result) => {
      if (result) {
        setMonth(MONTH_NAMES[result.month - 1]);
        setYear(result.year);
      } else {
        const now = new Date();
        setMonth(MONTH_NAMES[now.getMonth()]);
        setYear(now.getFullYear());
      }
    });
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
      return;
    }
    const result = await fetchAttendanceByDate(selectedDate, month, year);
    setSessions(result);
  }, [month, year, selectedDate]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  function handleMonthChange(m: string, y: number) {
    setMonth(m);
    setYear(y);
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

  if (!month || year === null) return null;

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-headline-lg text-gray-900">Presenças</h1>
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
          <div className="flex gap-2 overflow-x-auto mb-8 pb-1">
            {sessionDates.map((d) => (
              <button
                key={d.date}
                onClick={() => setSelectedDate(d.date)}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-label-md whitespace-nowrap transition-colors ${
                  selectedDate === d.date
                    ? 'bg-on-primary-fixed text-white'
                    : 'bg-surface-container-lowest border border-surface-container-highest text-gray-600 hover:bg-surface-container-low'
                }`}
              >
                {d.date} {d.dayOfWeek}
              </button>
            ))}
          </div>

          {sessions.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-16 text-center">
              <p className="text-body-lg text-gray-500">Nenhuma sessão neste dia.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-10">
              {sessions.map((session) => {
                const presentCount = session.children.filter((c) => c.present === true).length;
                return (
                  <div key={session.sessionId}>
                    <div className="flex items-center gap-4 mb-4">
                      <span className={`px-3 py-1 rounded-full text-label-md ${SLOT_PILL[session.slot]}`}>
                        {SLOT_LABEL[session.slot]}
                      </span>
                      <span className="text-body-md text-gray-500">
                        {presentCount}/{session.children.length} presentes
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {session.children.map((child) => (
                        <AttendanceCard
                          key={child.sessionChildId}
                          child={child}
                          onMark={handleMark}
                        />
                      ))}
                    </div>
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
