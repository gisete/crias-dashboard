import { supabaseClient } from '@/lib/supabase/client';
import type { Session, SessionChild, Slot } from '@/types/sessions';
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
  registration_id: string;
  photos_ready: boolean;
  per_session_value: number | null;
  has_photos: boolean;
  child: { name: string; date_of_birth: string | null } | null;
  registration: {
    plan: string;
    unit_price: number;
    total_price: number;
    num_sessions: number;
    foto_sessions: number | null;
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
      'id, session_id, registration_id, photos_ready, per_session_value, has_photos, child:children(name, date_of_birth), registration:registrations(plan, unit_price, total_price, num_sessions, foto_sessions, image_consent, status, family:families(parent_name))',
    )
    .in('session_id', sessionIds);

  if (childrenError) {
    console.error('fetchSessionsByMonth session_children error:', childrenError);
  }

  const rows = (childrenData ?? []) as unknown as SessionChildRow[];

  const childrenBySession = new Map<string, SessionChild[]>();
  const allSessionChildren: SessionChild[] = [];
  // Unique sessions with photos per registration — siblings on the same
  // session share one photo date, so raw row counts would overcount.
  const photoSessionsByRegistration = new Map<string, Set<string>>();

  for (const row of rows) {
    if (!row.child || !row.registration) continue;

    const consent = mapConsent(row.registration.image_consent);
    const perSessionValue = row.per_session_value ??
      (row.registration.num_sessions > 0
        ? row.registration.unit_price / row.registration.num_sessions
        : 0);

    const sessionChild: SessionChild = {
      sessionChildId: row.id,
      childName: row.child.name,
      birthDate: row.child.date_of_birth ?? '',
      responsavelName: row.registration.family?.parent_name ?? '',
      consent,
      hasPhotoPlan: row.has_photos,
      perSessionValue,
      photosReady: row.photos_ready,
      registrationStatus: row.registration.status,
      fotoSessions: row.registration.foto_sessions ?? 0,
      assignedPhotoCount: 0,
      registrationId: row.registration_id,
    };

    allSessionChildren.push(sessionChild);

    if (!childrenBySession.has(row.session_id)) {
      childrenBySession.set(row.session_id, []);
    }
    childrenBySession.get(row.session_id)!.push(sessionChild);

    if (row.has_photos) {
      const set = photoSessionsByRegistration.get(row.registration_id) ?? new Set<string>();
      set.add(row.session_id);
      photoSessionsByRegistration.set(row.registration_id, set);
    }
  }

  for (const sc of allSessionChildren) {
    sc.assignedPhotoCount = photoSessionsByRegistration.get(sc.registrationId)?.size ?? 0;
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

export async function setSessionPhotos(
  sessionChildId: string,
  hasPhotos: boolean,
): Promise<{ success: boolean }> {
  const { error } = await supabaseClient
    .from('session_children')
    .update({ has_photos: hasPhotos })
    .eq('id', sessionChildId);

  if (error) console.error('setSessionPhotos error:', error);
  return { success: !error };
}

export async function reassignSessionPhotos(
  registrationId: string,
  fotoSessions: number,
): Promise<{ success: boolean }> {
  interface Row {
    id: string;
    sessions: { date: string } | null;
  }

  const { data, error: fetchError } = await supabaseClient
    .from('session_children')
    .select('id, sessions(date)')
    .eq('registration_id', registrationId);

  if (fetchError) {
    console.error('reassignSessionPhotos fetch error:', fetchError);
    return { success: false };
  }

  const rows = (data ?? []) as unknown as Row[];

  const uniqueDates = [
    ...new Set(rows.filter((r) => r.sessions).map((r) => r.sessions!.date)),
  ].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const photoDates = new Set(uniqueDates.slice(0, fotoSessions));

  const trueIds: string[] = [];
  const falseIds: string[] = [];
  for (const row of rows) {
    if (row.sessions && photoDates.has(row.sessions.date)) {
      trueIds.push(row.id);
    } else {
      falseIds.push(row.id);
    }
  }

  const results = await Promise.all([
    trueIds.length > 0
      ? supabaseClient.from('session_children').update({ has_photos: true }).in('id', trueIds)
      : Promise.resolve({ error: null }),
    falseIds.length > 0
      ? supabaseClient.from('session_children').update({ has_photos: false }).in('id', falseIds)
      : Promise.resolve({ error: null }),
  ]);

  const success = results.every((r) => !r.error);
  if (!success) console.error('reassignSessionPhotos update error');
  return { success };
}
