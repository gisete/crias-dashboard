import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { syncSessionEntries } from '@/lib/data/sessions-sync';
import { normalizeDateEntry } from '@/lib/date-utils';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let dates: unknown;
  try {
    ({ dates } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(dates) || !dates.every((d) => typeof d === 'string')) {
    return NextResponse.json({ error: 'dates must be an array of strings' }, { status: 400 });
  }

  const normalized = dates.map((d) => normalizeDateEntry(d.trim())).filter(Boolean);

  const supabase = createServerClient();

  const { data: updated, error } = await supabase
    .from('registrations')
    .update({ selected_dates: normalized })
    .eq('id', id)
    .select('status')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
  }

  // Session entries only exist for confirmed registrations; syncing for any
  // other status would create them prematurely.
  if (updated.status === 'pago_confirmado') {
    await syncSessionEntries(id, normalized);
  }

  return NextResponse.json({ success: true });
}
