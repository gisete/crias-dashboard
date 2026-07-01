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

async function upsertSession(
  supabase: ServerClient,
  date: string,
  slot: 'manhã' | 'tarde',
  month: string,
  year: number,
  capacity: number,
): Promise<string | null> {
  await supabase
    .from('sessions')
    .upsert(
      { date, slot, month, year, capacity },
      { onConflict: 'date,slot,month,year', ignoreDuplicates: true },
    );

  const { data } = await supabase
    .from('sessions')
    .select('id')
    .eq('date', date)
    .eq('slot', slot)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();

  return data?.id ?? null;
}

async function removeOrphanedSessions(supabase: ServerClient, sessionIds: string[]): Promise<void> {
  for (const sessionId of sessionIds) {
    const { count } = await supabase
      .from('session_children')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (!count) {
      await supabase.from('sessions').delete().eq('id', sessionId);
    }
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
  if (childIds.length === 0) return;

  const defaultCapacity = await getDefaultCapacity(supabase);

  for (const dateStr of (reg.selected_dates as string[]) ?? []) {
    const parsed = parseDateString(dateStr);
    if (!parsed) continue;

    const sessionId = await upsertSession(
      supabase,
      parsed.date,
      parsed.slot,
      reg.month,
      reg.year,
      defaultCapacity,
    );
    if (!sessionId) continue;

    for (const childId of childIds) {
      await supabase
        .from('session_children')
        .upsert(
          { session_id: sessionId, child_id: childId, registration_id: registrationId },
          { onConflict: 'session_id,child_id', ignoreDuplicates: true },
        );
    }
  }
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

  const sessionIdsToCheck = new Set<string>();
  for (const row of toRemove) {
    await supabase.from('session_children').delete().eq('id', row.id);
    sessionIdsToCheck.add(row.session_id);
  }

  await removeOrphanedSessions(supabase, [...sessionIdsToCheck]);

  if (toAdd.length > 0 && childIds.length > 0) {
    const defaultCapacity = await getDefaultCapacity(supabase);

    for (const dateStr of toAdd) {
      const parsed = parseDateString(dateStr);
      if (!parsed) continue;

      const sessionId = await upsertSession(
        supabase,
        parsed.date,
        parsed.slot,
        reg.month,
        reg.year,
        defaultCapacity,
      );
      if (!sessionId) continue;

      for (const childId of childIds) {
        await supabase
          .from('session_children')
          .upsert(
            { session_id: sessionId, child_id: childId, registration_id: registrationId },
            { onConflict: 'session_id,child_id', ignoreDuplicates: true },
          );
      }
    }
  }
}
