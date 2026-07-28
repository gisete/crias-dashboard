import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('unmatched_submissions')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Submissão não encontrada.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
