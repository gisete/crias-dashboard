import { supabaseClient } from '@/lib/supabase/client';
import { MONTH_TO_NUMBER } from '@/lib/months';
import { mapConsent, type ConsentType } from '@/lib/consent-utils';

const WEEKDAY_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export interface SessionDate {
  date: string;
  dayOfWeek: string;
}

export interface AttendanceChild {
  sessionChildId: string;
  childName: string;
  dateOfBirth: string | null;
  parentName: string;
  present: boolean | null;
  hasPhotos: boolean;
  imageConsent: ConsentType;
  perSessionValue: number;
  isPack: boolean;
}

export interface AttendanceSession {
  sessionId: string;
  date: string;
  slot: 'manhã' | 'tarde';
  children: AttendanceChild[];
}

/**
 * Fetch all session dates for a month (just distinct dates that have sessions).
 * Returns sorted array of { date, dayOfWeek } for the date stepper.
 */
export async function fetchSessionDates(month: string, year: number): Promise<SessionDate[]> {
  const { data, error } = await supabaseClient
    .from('sessions')
    .select('date')
    .eq('month', month)
    .eq('year', year);

  if (error) {
    console.error('fetchSessionDates error:', error);
    return [];
  }

  const monthNum = MONTH_TO_NUMBER[month] ?? 1;
  const uniqueDates = [...new Set((data ?? []).map((r) => r.date as string))];

  return uniqueDates
    .map((date) => {
      const day = parseInt(date, 10);
      const jsDate = new Date(year, monthNum - 1, day);
      return { date, dayOfWeek: WEEKDAY_ABBR[jsDate.getDay()] };
    })
    .sort((a, b) => parseInt(a.date, 10) - parseInt(b.date, 10));
}

/**
 * Fetch sessions and children for a specific date in a month.
 * Returns sessions for that date with their children and attendance status.
 */
export async function fetchAttendanceByDate(
  date: string,
  month: string,
  year: number,
): Promise<AttendanceSession[]> {
  const { data: sessionsData, error: sessionsError } = await supabaseClient
    .from('sessions')
    .select('id, date, slot')
    .eq('date', date)
    .eq('month', month)
    .eq('year', year);

  if (sessionsError) {
    console.error('fetchAttendanceByDate sessions error:', sessionsError);
    return [];
  }

  const sessions = sessionsData ?? [];
  if (sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id);

  const { data: childrenData, error: childrenError } = await supabaseClient
    .from('session_children')
    .select(
      'id, session_id, present, child:children(name, date_of_birth), registration:registrations(has_photos, plan, total_price, num_sessions, image_consent, family:families(parent_name))',
    )
    .in('session_id', sessionIds);

  if (childrenError) {
    console.error('fetchAttendanceByDate session_children error:', childrenError);
  }

  interface Row {
    id: string;
    session_id: string;
    present: boolean | null;
    child: { name: string; date_of_birth: string | null } | null;
    registration: {
      has_photos: boolean;
      plan: string;
      total_price: number;
      num_sessions: number;
      image_consent: string | null;
      family: { parent_name: string } | null;
    } | null;
  }

  const rows = (childrenData ?? []) as unknown as Row[];

  const childrenBySession = new Map<string, AttendanceChild[]>();

  for (const row of rows) {
    if (!row.child) continue;

    const numSessions = row.registration?.num_sessions ?? 0;
    const perSessionValue =
      numSessions > 0 && row.registration ? row.registration.total_price / numSessions : 0;

    const child: AttendanceChild = {
      sessionChildId: row.id,
      childName: row.child.name,
      dateOfBirth: row.child.date_of_birth,
      parentName: row.registration?.family?.parent_name ?? '',
      present: row.present,
      hasPhotos: row.registration?.has_photos ?? false,
      imageConsent: mapConsent(row.registration?.image_consent),
      perSessionValue,
      isPack: numSessions > 1,
    };

    if (!childrenBySession.has(row.session_id)) {
      childrenBySession.set(row.session_id, []);
    }
    childrenBySession.get(row.session_id)!.push(child);
  }

  return sessions
    .slice()
    .sort((a, b) => (a.slot === 'manhã' ? 0 : 1) - (b.slot === 'manhã' ? 0 : 1))
    .map((s) => ({
      sessionId: s.id,
      date: s.date,
      slot: s.slot as 'manhã' | 'tarde',
      children: childrenBySession.get(s.id) ?? [],
    }));
}

/**
 * Mark attendance for a session_child with the given value.
 * Callers toggle an already-active value back to null before calling this.
 */
export async function markAttendance(
  sessionChildId: string,
  present: boolean | null,
): Promise<{ success: boolean }> {
  const { error } = await supabaseClient
    .from('session_children')
    .update({
      present,
      marked_at: present === null ? null : new Date().toISOString(),
    })
    .eq('id', sessionChildId);

  if (error) console.error('markAttendance error:', error);
  return { success: !error };
}
