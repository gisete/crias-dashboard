import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const status = request.nextUrl.searchParams.get('status');

  let query = supabase
    .from('unmatched_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  query = status ? query.eq('review_status', status) : query.in('review_status', ['pending', 'notified']);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ submissions: data ?? [] });
}
