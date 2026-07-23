import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { MONTH_TO_NUMBER } from '@/lib/months';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let month: string;
  let year: number;
  try {
    const body = await request.json();
    month = body.month;
    year = body.year;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Object.keys(MONTH_TO_NUMBER).includes(month)) {
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: monthRow, error: monthError } = await supabase
    .from('months')
    .select('id')
    .eq('month', MONTH_TO_NUMBER[month])
    .eq('year', year)
    .maybeSingle();

  if (monthError) {
    return NextResponse.json({ error: monthError.message }, { status: 500 });
  }

  if (!monthRow) {
    return NextResponse.json({ error: 'Mês não encontrado' }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from('registrations')
    .update({ month_id: monthRow.id, month, year })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
