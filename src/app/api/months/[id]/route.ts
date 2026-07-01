import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { MONTH_NAMES } from '@/lib/months';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let status: unknown;
  try {
    ({ status } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (status !== 'active' && status !== 'archived') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('months')
    .update({ status })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Month not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: month, error: monthError } = await supabase
    .from('months')
    .select('id, year, month')
    .eq('id', id)
    .maybeSingle();

  if (monthError) {
    return NextResponse.json({ error: monthError.message }, { status: 500 });
  }

  if (!month) {
    return NextResponse.json({ error: 'Month not found' }, { status: 404 });
  }

  const monthName = MONTH_NAMES[month.month - 1];

  const { count, error: countError } = await supabase
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .or(`month_id.eq.${id},and(month_id.is.null,month.eq.${monthName},year.eq.${month.year})`);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if (count && count > 0) {
    return NextResponse.json(
      { error: 'Não é possível eliminar um mês com inscrições.' },
      { status: 409 },
    );
  }

  const { error: deleteError } = await supabase.from('months').delete().eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
