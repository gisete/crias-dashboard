import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSessionEntries, removeSessionEntries } from '@/lib/data/sessions-sync';
import { sendStatusWebhook } from '@/lib/make-webhook';
import { getMissingFields, formatMissingFields } from '@/lib/registration-validation';
import { ALL_STATUSES } from '@/lib/status-utils';
import type { RegistrationStatus } from '@/types/database';

interface FetchedRegistration {
  status: RegistrationStatus;
  webhook_error: boolean;
  webhook_error_message: string | null;
  month: string;
  plan: string;
  unit_price: number;
  num_sessions: number;
  num_children: number;
  selected_dates: string[];
  family: { parent_name: string; email: string; phone: string | null } | null;
  children: { name: string; removed_at: string | null }[] | null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let status: RegistrationStatus;
  let silent = false;
  try {
    const body = await request.json();
    status = body.status;
    silent = body.silent === true;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!ALL_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data, error: fetchError } = await supabase
    .from('registrations')
    .select(
      'status, webhook_error, webhook_error_message, month, plan, unit_price, num_sessions, num_children, selected_dates, family:families(parent_name, email, phone), children(name, removed_at)',
    )
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
  }

  const current = data as unknown as FetchedRegistration;
  const oldStatus = current.status;

  const missing = getMissingFields(
    {
      month: current.month,
      plan: current.plan,
      unit_price: current.unit_price,
      num_sessions: current.num_sessions,
      num_children: current.num_children,
      selected_dates: current.selected_dates,
      family: current.family ?? { parent_name: null, email: null, phone: null },
      children: current.children ?? [],
    },
    { target: status, silent },
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

  const { error: updateError } = await supabase
    .from('registrations')
    .update({ status })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  try {
    if (status === 'pago_confirmado' && oldStatus !== 'pago_confirmado') {
      await createSessionEntries(id);
    } else if (oldStatus === 'pago_confirmado' && status !== 'pago_confirmado') {
      await removeSessionEntries(id);
    }
  } catch (error) {
    // The status update already succeeded — surface the partial state
    // instead of a bare 500 so the caller knows sessions are out of sync.
    console.error(`Session sync failed for registration ${id}:`, error);
    return NextResponse.json(
      { error: 'Estado atualizado, mas a sincronização de sessões falhou.' },
      { status: 500 },
    );
  }

  if (status !== 'pendente' && !silent) {
    try {
      await sendStatusWebhook(id, status);

      if (current.webhook_error) {
        await supabase
          .from('registrations')
          .update({ webhook_error: false, webhook_error_message: null })
          .eq('id', id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`Webhook failed for registration ${id}:`, error);
      await supabase
        .from('registrations')
        .update({
          webhook_error: true,
          webhook_error_message: `Erro ao enviar notificação: ${message}`,
        })
        .eq('id', id);
    }
  }

  return NextResponse.json({ success: true });
}
