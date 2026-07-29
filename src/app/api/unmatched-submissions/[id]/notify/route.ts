import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: submission, error: fetchError } = await supabase
    .from('unmatched_submissions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!submission) {
    return NextResponse.json({ error: 'Submissão não encontrada.' }, { status: 404 });
  }

  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('MAKE_WEBHOOK_URL não está configurado — a saltar notificação Make.');
  } else {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'email_nao_encontrado',
          email: submission.email,
          plan: submission.plan,
          month: submission.month,
          year: submission.year,
          selected_dates: submission.selected_dates,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return NextResponse.json({ error: 'Falha ao enviar notificação.' }, { status: 502 });
      }
    } catch {
      return NextResponse.json({ error: 'Falha ao enviar notificação.' }, { status: 502 });
    }
  }

  const { error: updateError } = await supabase
    .from('unmatched_submissions')
    .update({ review_status: 'notified', notified_at: new Date().toISOString() })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
