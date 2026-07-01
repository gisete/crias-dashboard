import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  let year: unknown;
  let month: unknown;
  try {
    ({ year, month } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    (month as number) < 1 ||
    (month as number) > 12
  ) {
    return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('months')
    .insert({ year, month, status: 'active' })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Month already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, year, month }, { status: 201 });
}
