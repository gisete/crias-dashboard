import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { syncSessionEntries } from '@/lib/data/sessions-sync';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { dates } = await request.json();

  const supabase = createServerClient();

  const { error } = await supabase
    .from('registrations')
    .update({ selected_dates: dates })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await syncSessionEntries(id, dates);

  return NextResponse.json({ success: true });
}
