import { createServerClient } from '@/lib/supabase/server';
import { MONTH_TO_NUMBER } from '@/lib/months';
import { getTodayLisbon } from '@/lib/date-utils';
import { computePerSessionValues } from '@/lib/plan-parser';

type ServerClient = ReturnType<typeof createServerClient>;

/**
 * Parse a date string like "5 (manhã)" into { date: "5", slot: "manhã" }
 */
function parseDateString(dateStr: string): { date: string; slot: 'manhã' | 'tarde' } | null {
  const match = dateStr.match(/^(\d+)\s*\((manhã|tarde)\)/);
  if (!match) return null;
  return { date: match[1], slot: match[2] as 'manhã' | 'tarde' };
}

async function getDefaultCapacity(supabase: ServerClient): Promise<number> {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'default_session_capacity')
    .maybeSingle();

  return data ? Number(data.value) : 16;
}

/**
 * Batched insert of sessions + session_children for a set of dates.
 * Three round trips total (upsert sessions, select ids, upsert children)
 * instead of per-date/per-child queries.
 */
async function addSessionEntries(
  supabase: ServerClient,
  registrationId: string,
  month: string,
  year: number,
  dates: string[],
  childIds: string[],
  plan: string,
): Promise<void> {
  const parsedDates = dates
    .map(parseDateString)
    .filter((p): p is { date: string; slot: 'manhã' | 'tarde' } => p !== null);

  if (parsedDates.length === 0 || childIds.length === 0) return;

  const perSessionValues = computePerSessionValues(plan, parsedDates.length);

  const capacity = await getDefaultCapacity(supabase);

  await supabase.from('sessions').upsert(
    parsedDates.map((p) => ({ date: p.date, slot: p.slot, month, year, capacity })),
    { onConflict: 'date,slot,month,year', ignoreDuplicates: true },
  );

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, date, slot')
    .eq('month', month)
    .eq('year', year)
    .in('date', parsedDates.map((p) => p.date));

  const sessionIdByKey = new Map(
    (sessions ?? []).map((s) => [`${s.date}|${s.slot}`, s.id as string]),
  );

  const rows = parsedDates.flatMap((p, dateIndex) => {
    const sessionId = sessionIdByKey.get(`${p.date}|${p.slot}`);
    if (!sessionId) return [];
    return childIds.map((childId) => ({
      session_id: sessionId,
      child_id: childId,
      registration_id: registrationId,
      per_session_value: perSessionValues[dateIndex] ?? 0,
    }));
  });

  if (rows.length > 0) {
    await supabase
      .from('session_children')
      .upsert(rows, { onConflict: 'session_id,child_id', ignoreDuplicates: true });
  }

  await assignSessionPhotos(supabase, registrationId);
}

/**
 * Assign has_photos to a registration's session_children rows based on
 * foto_sessions: the first N chronological session dates get the photo
 * flag, the rest don't. Called after new session_children rows are added.
 */
export async function assignSessionPhotos(
  supabase: ServerClient,
  registrationId: string,
): Promise<void> {
  const { data: reg } = await supabase
    .from('registrations')
    .select('foto_sessions')
    .eq('id', registrationId)
    .maybeSingle();

  const fotoSessions = reg?.foto_sessions ?? 0;

  if (fotoSessions === 0) {
    await supabase
      .from('session_children')
      .update({ has_photos: false })
      .eq('registration_id', registrationId);
    return;
  }

  interface Row {
    id: string;
    sessions: { date: string } | null;
  }

  const { data: rows } = await supabase
    .from('session_children')
    .select('id, sessions(date)')
    .eq('registration_id', registrationId);

  const typed = (rows ?? []) as unknown as Row[];

  const uniqueDates = [
    ...new Set(typed.filter((r) => r.sessions).map((r) => r.sessions!.date)),
  ].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const photoDates = new Set(uniqueDates.slice(0, fotoSessions));

  const trueIds: string[] = [];
  const falseIds: string[] = [];
  for (const row of typed) {
    if (row.sessions && photoDates.has(row.sessions.date)) {
      trueIds.push(row.id);
    } else {
      falseIds.push(row.id);
    }
  }

  if (trueIds.length > 0) {
    await supabase.from('session_children').update({ has_photos: true }).in('id', trueIds);
  }
  if (falseIds.length > 0) {
    await supabase.from('session_children').update({ has_photos: false }).in('id', falseIds);
  }
}

async function removeOrphanedSessions(supabase: ServerClient, sessionIds: string[]): Promise<void> {
  if (sessionIds.length === 0) return;

  const { data: stillUsed } = await supabase
    .from('session_children')
    .select('session_id')
    .in('session_id', sessionIds);

  const usedIds = new Set((stillUsed ?? []).map((r) => r.session_id as string));
  const orphaned = sessionIds.filter((id) => !usedIds.has(id));

  if (orphaned.length > 0) {
    await supabase.from('sessions').delete().in('id', orphaned);
  }
}

/**
 * When a registration becomes pago_confirmado:
 * - For each selected_date, upsert a sessions row (capacity = default from settings table)
 * - For each child on the registration, insert a session_children row
 */
export async function createSessionEntries(registrationId: string): Promise<void> {
  const supabase = createServerClient();

  const { data: reg } = await supabase
    .from('registrations')
    .select('month, year, selected_dates, plan')
    .eq('id', registrationId)
    .maybeSingle();

  if (!reg) return;

  const { data: children } = await supabase
    .from('children')
    .select('id')
    .eq('registration_id', registrationId)
    .is('removed_at', null);

  const childIds = (children ?? []).map((c) => c.id as string);

  await addSessionEntries(
    supabase,
    registrationId,
    reg.month,
    reg.year,
    (reg.selected_dates as string[]) ?? [],
    childIds,
    reg.plan as string,
  );
}

/**
 * When a registration leaves pago_confirmado:
 * - Delete all session_children rows for this registration
 * - Clean up orphaned sessions (sessions with no session_children left)
 */
export async function removeSessionEntries(registrationId: string): Promise<void> {
  const supabase = createServerClient();

  const { data: rows } = await supabase
    .from('session_children')
    .select('session_id')
    .eq('registration_id', registrationId);

  const sessionIds = [...new Set((rows ?? []).map((r) => r.session_id as string))];

  await supabase.from('session_children').delete().eq('registration_id', registrationId);

  await removeOrphanedSessions(supabase, sessionIds);
}

/**
 * When selected_dates are edited on a pago_confirmado registration:
 * - Remove session_children for dates no longer selected
 * - Add session_children for newly selected dates
 * - Clean up orphaned sessions
 */
export async function syncSessionEntries(registrationId: string, newDates: string[]): Promise<void> {
  const supabase = createServerClient();

  const { data: reg } = await supabase
    .from('registrations')
    .select('month, year, plan')
    .eq('id', registrationId)
    .maybeSingle();

  if (!reg) return;

  const { data: children } = await supabase
    .from('children')
    .select('id')
    .eq('registration_id', registrationId)
    .is('removed_at', null);

  const childIds = (children ?? []).map((c) => c.id as string);

  interface ExistingRow {
    id: string;
    session_id: string;
    sessions: { date: string; slot: string } | null;
  }

  const { data: existingRows } = await supabase
    .from('session_children')
    .select('id, session_id, sessions(date, slot)')
    .eq('registration_id', registrationId);

  const existing = (existingRows ?? []) as unknown as ExistingRow[];

  const newDateSet = new Set(newDates);
  const toRemove = existing.filter((row) => {
    if (!row.sessions) return false;
    const dateStr = `${row.sessions.date} (${row.sessions.slot})`;
    return !newDateSet.has(dateStr);
  });

  const oldDateSet = new Set(
    existing
      .filter((row) => row.sessions)
      .map((row) => `${row.sessions!.date} (${row.sessions!.slot})`),
  );
  const toAdd = newDates.filter((d) => !oldDateSet.has(d));

  if (toRemove.length > 0) {
    await supabase
      .from('session_children')
      .delete()
      .in('id', toRemove.map((row) => row.id));

    await removeOrphanedSessions(supabase, [...new Set(toRemove.map((row) => row.session_id))]);
  }

  await addSessionEntries(supabase, registrationId, reg.month, reg.year, toAdd, childIds, reg.plan as string);

  await recomputeSessionValues(registrationId);
}

/**
 * When children are dropped from a family's Brevo contact: remove them from
 * sessions that haven't happened yet, but leave past ones alone so historical
 * session and attendance records still show the child.
 */
export async function removeChildrenFromUpcomingSessions(childIds: string[]): Promise<void> {
  if (childIds.length === 0) return;

  const supabase = createServerClient();

  interface Row {
    id: string;
    session_id: string;
    sessions: { date: string; month: string; year: number } | null;
  }

  const { data: rows } = await supabase
    .from('session_children')
    .select('id, session_id, sessions(date, month, year)')
    .in('child_id', childIds);

  const today = getTodayLisbon();

  // sessions.date is a bare day-of-month ("5"), with month/year alongside it,
  // so rebuild a comparable YYYY-MM-DD before checking against today.
  const upcoming = ((rows ?? []) as unknown as Row[]).filter((row) => {
    if (!row.sessions) return false;
    const monthNumber = MONTH_TO_NUMBER[row.sessions.month];
    if (!monthNumber) return false;
    const day = parseInt(row.sessions.date, 10);
    if (Number.isNaN(day)) return false;
    const iso = `${row.sessions.year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return iso >= today;
  });

  if (upcoming.length === 0) return;

  await supabase
    .from('session_children')
    .delete()
    .in('id', upcoming.map((row) => row.id));

  await removeOrphanedSessions(supabase, [...new Set(upcoming.map((row) => row.session_id))]);
}

/**
 * Recalculate per_session_value for every session_child row belonging to
 * a registration, using the plan's per-part pricing and the chronological
 * date order. Called after date edits (syncSessionEntries) and can also be
 * called after plan edits.
 */
export async function recomputeSessionValues(registrationId: string): Promise<void> {
  const supabase = createServerClient();

  const { data: reg } = await supabase
    .from('registrations')
    .select('plan')
    .eq('id', registrationId)
    .maybeSingle();

  if (!reg) return;

  interface Row {
    id: string;
    sessions: { date: string; slot: string } | null;
  }

  const { data: rows } = await supabase
    .from('session_children')
    .select('id, sessions(date, slot)')
    .eq('registration_id', registrationId);

  const typed = (rows ?? []) as unknown as Row[];
  const withSession = typed.filter((r) => r.sessions);
  if (withSession.length === 0) return;

  // Build ordered unique date keys
  const uniqueKeys = [
    ...new Set(
      withSession
        .slice()
        .sort((a, b) => {
          const da = parseInt(a.sessions!.date, 10);
          const db = parseInt(b.sessions!.date, 10);
          if (da !== db) return da - db;
          return a.sessions!.slot === 'manhã' ? -1 : 1;
        })
        .map((r) => `${r.sessions!.date}|${r.sessions!.slot}`),
    ),
  ];

  const values = computePerSessionValues(reg.plan, uniqueKeys.length);
  const valueByKey = new Map<string, number>();
  uniqueKeys.forEach((key, i) => valueByKey.set(key, values[i]));

  // Batch update: group rows by their target value to minimize queries
  const idsByValue = new Map<number, string[]>();
  for (const row of withSession) {
    const key = `${row.sessions!.date}|${row.sessions!.slot}`;
    const val = valueByKey.get(key) ?? 0;
    const ids = idsByValue.get(val) ?? [];
    ids.push(row.id);
    idsByValue.set(val, ids);
  }

  for (const [val, ids] of idsByValue.entries()) {
    await supabase
      .from('session_children')
      .update({ per_session_value: val })
      .in('id', ids);
  }
}
