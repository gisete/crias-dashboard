import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { buildStatusWebhookPayload, type WebhookRegistration, type WebhookFamily, type WebhookChild } from '@/lib/make-webhook';
import { formatSelectedDate } from '@/lib/date-utils';
import type { RegistrationStatus } from '@/types/database';

interface FetchedRegistration extends WebhookRegistration {
  family: WebhookFamily | null;
  children: (WebhookChild & { removed_at: string | null })[] | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // The date is optional — a registration may have no selected dates at all,
  // so a missing or unparseable body just means "send without naming one".
  let pickedDate: string | null = null;
  try {
    const body = await request.json();
    if (typeof body?.date === 'string') pickedDate = body.date;
  } catch {
    // No body sent.
  }

  const url = process.env.MAKE_WEBHOOK_URL;
  if (!url) {
    return NextResponse.json({ error: 'MAKE_WEBHOOK_URL não está definido' }, { status: 500 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('registrations')
    .select(
      'id, month, year, plan, unit_price, total_price, num_sessions, num_children, has_photos, selected_dates, nif, voucher_code, notes, family:families(parent_name, email, phone), children(name, date_of_birth, removed_at)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
  }

  const registration = data as unknown as FetchedRegistration;

  if (!registration.family) {
    return NextResponse.json({ error: 'Registration has no associated family' }, { status: 500 });
  }

  // Only a date the family actually picked may reach the customer email.
  if (pickedDate && !registration.selected_dates.includes(pickedDate)) {
    return NextResponse.json({ error: 'Data selecionada inválida' }, { status: 400 });
  }

  // Spread rather than extend StatusWebhookPayload — the builder is shared
  // with sendStatusWebhook and the unmatched-submissions notify route, and
  // neither should carry a Sessão Cheia field.
  const payload = {
    ...buildStatusWebhookPayload(
      registration,
      registration.family,
      (registration.children ?? []).filter((c) => !c.removed_at),
      'sessao_cheia' as RegistrationStatus,
    ),
    sessao_cheia_data: pickedDate ? formatSelectedDate(pickedDate, registration.month) : '',
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to reach Make webhook: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json({ error: `Make webhook responded with status ${response.status}` }, { status: 502 });
  }

  const notified_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('registrations')
    .update({ sessao_cheia_notified_at: notified_at })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, notified_at });
}
