import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: existing, error: fetchError } = await supabase
    .from('registrations')
    .select('fatura_enviada')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
  }

  const fatura_enviada = !existing.fatura_enviada;

  const { error: updateError } = await supabase
    .from('registrations')
    .update({ fatura_enviada })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ fatura_enviada });
}
