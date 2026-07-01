import { createServerClient } from '@/lib/supabase/server';

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
): Promise<void> {
  const parsedDates = dates
    .map(parseDateString)
    .filter((p): p is { date: string; slot: 'manhã' | 'tarde' } => p !== null);

  if (parsedDates.length === 0 || childIds.length === 0) return;

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

  const rows = parsedDates.flatMap((p) => {
    const sessionId = sessionIdByKey.get(`${p.date}|${p.slot}`);
    if (!sessionId) return [];
    return childIds.map((childId) => ({
      session_id: sessionId,
      child_id: childId,
      registration_id: registrationId,
    }));
  });

  if (rows.length > 0) {
    await supabase
      .from('session_children')
      .upsert(rows, { onConflict: 'session_id,child_id', ignoreDuplicates: true });
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
    .select('month, year, selected_dates')
    .eq('id', registrationId)
    .maybeSingle();

  if (!reg) return;

  const { data: children } = await supabase
    .from('children')
    .select('id')
    .eq('registration_id', registrationId);

  const childIds = (children ?? []).map((c) => c.id as string);

  await addSessionEntries(
    supabase,
    registrationId,
    reg.month,
    reg.year,
    (reg.selected_dates as string[]) ?? [],
    childIds,
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
    .select('month, year')
    .eq('id', registrationId)
    .maybeSingle();

  if (!reg) return;

  const { data: children } = await supabase
    .from('children')
    .select('id')
    .eq('registration_id', registrationId);

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

  await addSessionEntries(supabase, registrationId, reg.month, reg.year, toAdd, childIds);
}
