import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { buildStatusWebhookPayload, type WebhookRegistration, type WebhookFamily, type WebhookChild } from '@/lib/make-webhook';
import { formatSelectedDate } from '@/lib/date-utils';
import type { RegistrationStatus } from '@/types/database';
import { getMissingFields, formatMissingFields, joinPtList } from '@/lib/registration-validation';

interface FetchedRegistration extends WebhookRegistration {
  family: WebhookFamily | null;
  children: (WebhookChild & { removed_at: string | null })[] | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // The days are optional — a registration may have no selected dates at all,
  // so a missing or unparseable body just means "send without naming any".
  // The legacy single `date` is treated as a one-day list.
  let requestedDates: string[] = [];
  try {
    const body = await request.json();
    if (Array.isArray(body?.dates)) {
      requestedDates = body.dates.filter((d: unknown): d is string => typeof d === 'string');
    } else if (typeof body?.date === 'string') {
      requestedDates = [body.date];
    }
  } catch {
    // No body sent.
  }
  const pickedDates = [...new Set(requestedDates.map((d) => d.trim()).filter(Boolean))];

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

  // Sessão Cheia always fires from a 'pendente' registration but still sends
  // the full webhook payload, so force the full required-field check with a
  // non-pendente target — getMissingFields never blocks target 'pendente'.
  const missing = getMissingFields(
    {
      month: registration.month,
      plan: registration.plan,
      unit_price: registration.unit_price,
      num_sessions: registration.num_sessions,
      num_children: registration.num_children,
      selected_dates: registration.selected_dates,
      family: registration.family,
      children: registration.children ?? [],
    },
    { target: 'a_pagar', silent: false },
  );

  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: 'dados_em_falta',
        message: `Faltam dados: ${formatMissingFields(missing)}.`,
        missing,
      },
      { status: 422 },
    );
  }

  // Only dates the family actually picked may reach the customer email.
  if (pickedDates.some((d) => !registration.selected_dates.includes(d))) {
    return NextResponse.json({ error: 'Data selecionada inválida.' }, { status: 400 });
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
    sessao_cheia_data: joinPtList(pickedDates.map((d) => formatSelectedDate(d, registration.month))),
    sessao_cheia_num_dias: pickedDates.length,
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
