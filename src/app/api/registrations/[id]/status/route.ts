import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSessionEntries, removeSessionEntries } from '@/lib/data/sessions-sync';
import { sendStatusWebhook } from '@/lib/make-webhook';
import { ALL_STATUSES } from '@/lib/status-utils';
import type { RegistrationStatus } from '@/types/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let status: RegistrationStatus;
  try {
    ({ status } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!ALL_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: current, error: fetchError } = await supabase
    .from('registrations')
    .select('status, webhook_error')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!current) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
  }

  const oldStatus = current.status as RegistrationStatus;

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

  if (status !== 'pendente') {
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
