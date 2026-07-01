import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSessionEntries, removeSessionEntries } from '@/lib/data/sessions-sync';
import type { RegistrationStatus } from '@/types/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { status } = await request.json();

  const supabase = createServerClient();

  const { data: current, error: fetchError } = await supabase
    .from('registrations')
    .select('status')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!current) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
  }

  const oldStatus = current.status as RegistrationStatus;

  const { error: updateError } = await supabase
    .from('registrations')
    .update({ status })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (status === 'pago_confirmado' && oldStatus !== 'pago_confirmado') {
    await createSessionEntries(id);
  } else if (oldStatus === 'pago_confirmado' && status !== 'pago_confirmado') {
    await removeSessionEntries(id);
  }

  return NextResponse.json({ success: true });
}
