import { supabaseClient } from '@/lib/supabase/client';
import type { Session, SessionChild, Slot } from '@/types/sessions';
import { parsePlan } from '@/lib/plan-parser';
import { MONTH_TO_NUMBER } from '@/lib/months';
import { mapConsent } from '@/lib/consent-utils';

export { getAvailableYears } from './registrations';

interface SessionRow {
  id: string;
  date: string;
  slot: Slot;
  capacity: number;
}

interface SessionChildRow {
  id: string;
  session_id: string;
  photos_ready: boolean;
  child: { name: string; date_of_birth: string | null } | null;
  registration: {
    plan: string;
    total_price: number;
    num_sessions: number;
    image_consent: string | null;
    status: string;
    family: { parent_name: string } | null;
  } | null;
}

export async function fetchSessionsByMonth(month: string, year: number): Promise<Session[]> {
  const { data: sessionsData, error: sessionsError } = await supabaseClient
    .from('sessions')
    .select('id, date, slot, capacity')
    .eq('month', month)
    .eq('year', year);

  if (sessionsError) {
    console.error('fetchSessionsByMonth sessions error:', sessionsError);
    return [];
  }

  const sessions = (sessionsData ?? []) as SessionRow[];
  if (sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id);

  const { data: childrenData, error: childrenError } = await supabaseClient
    .from('session_children')
    .select(
      'id, session_id, photos_ready, child:children(name, date_of_birth), registration:registrations(plan, total_price, num_sessions, image_consent, status, family:families(parent_name))',
    )
    .in('session_id', sessionIds);

  if (childrenError) {
    console.error('fetchSessionsByMonth session_children error:', childrenError);
  }

  const rows = (childrenData ?? []) as unknown as SessionChildRow[];

  const childrenBySession = new Map<string, SessionChild[]>();

  for (const row of rows) {
    if (!row.child || !row.registration) continue;

    const { hasPhotos } = parsePlan(row.registration.plan);
    const consent = mapConsent(row.registration.image_consent);
    const perSessionValue =
      row.registration.num_sessions > 0
        ? row.registration.total_price / row.registration.num_sessions
        : 0;

    const sessionChild: SessionChild = {
      sessionChildId: row.id,
      childName: row.child.name,
      birthDate: row.child.date_of_birth ?? '',
      responsavelName: row.registration.family?.parent_name ?? '',
      consent,
      hasPhotoPlan: hasPhotos,
      perSessionValue,
      photosReady: row.photos_ready,
      registrationStatus: row.registration.status,
    };

    if (!childrenBySession.has(row.session_id)) {
      childrenBySession.set(row.session_id, []);
    }
    childrenBySession.get(row.session_id)!.push(sessionChild);
  }

  const monthNum = MONTH_TO_NUMBER[month] ?? 1;

  return sessions
    .slice()
    .sort((a, b) => {
      const dayDiff = parseInt(a.date, 10) - parseInt(b.date, 10);
      if (dayDiff !== 0) return dayDiff;
      return a.slot === 'manhã' ? -1 : 1;
    })
    .map((s) => ({
      id: s.id,
      date: `${year}-${String(monthNum).padStart(2, '0')}-${String(parseInt(s.date, 10)).padStart(2, '0')}`,
      slot: s.slot,
      children: childrenBySession.get(s.id) ?? [],
      capacity: s.capacity,
    }));
}

export async function setPhotosReady(
  sessionChildId: string,
  ready: boolean,
): Promise<{ success: boolean }> {
  const { error } = await supabaseClient
    .from('session_children')
    .update({ photos_ready: ready })
    .eq('id', sessionChildId);

  if (error) console.error('setPhotosReady error:', error);
  return { success: !error };
}
