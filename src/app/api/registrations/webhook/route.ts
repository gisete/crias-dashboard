import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { parsePlan } from '@/lib/plan-parser';
import type { WebhookPayload } from '@/types/webhook';
import { MONTH_TO_NUMBER } from '@/lib/months';

function normalizeStringArray(value: string[] | string | null | undefined): string[] {
  if (!value) return [];
  if (typeof value === 'string') {
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return value
    .flatMap((s) => (typeof s === 'string' ? s.split(',') : []))
    .map((s) => s.trim())
    .filter(Boolean);
}

async function resolveMonthId(
  supabase: ReturnType<typeof createServerClient>,
  mes: string | null,
  year: number,
): Promise<string | null> {
  const monthNumber = mes ? MONTH_TO_NUMBER[mes.toLowerCase()] : undefined;
  if (!monthNumber) return null;

  const { data: exact } = await supabase
    .from('months')
    .select('id')
    .eq('year', year)
    .eq('month', monthNumber)
    .maybeSingle();

  if (exact) return exact.id;

  const { data: recent } = await supabase
    .from('months')
    .select('id')
    .eq('status', 'active')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent) return recent.id;

  const { data: created } = await supabase
    .from('months')
    .insert({ year, month: monthNumber, status: 'active' })
    .select('id')
    .single();

  return created?.id ?? null;
}

async function findOrCreateFamily(
  supabase: ReturnType<typeof createServerClient>,
  payload: WebhookPayload,
): Promise<string> {
  const { data: existing } = await supabase
    .from('families')
    .select('id, parent_name, phone')
    .ilike('email', payload.responsavel_email!)
    .maybeSingle();

  if (existing) {
    const updates: Record<string, string> = {};
    if (payload.responsavel_nome && !existing.parent_name) {
      updates.parent_name = payload.responsavel_nome;
    }
    if (payload.responsavel_telefone && !existing.phone) {
      updates.phone = payload.responsavel_telefone;
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from('families').update(updates).eq('id', existing.id);
    }
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from('families')
    .insert({
      email: payload.responsavel_email!,
      parent_name: payload.responsavel_nome ?? '',
      phone: payload.responsavel_telefone ?? null,
    })
    .select('id')
    .single();

  if (error || !created) {
    throw new Error(`Failed to create family: ${error?.message}`);
  }
  return created.id;
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret');
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  let body: WebhookPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.responsavel_email) {
    return NextResponse.json({ status: 'error', message: 'responsavel_email is required' }, { status: 400 });
  }

  body.datas_selecionadas = normalizeStringArray(body.datas_selecionadas);

  try {
    const supabase = createServerClient();

    // Deduplicate
    if (body.tally_submission_id) {
      const { data: existing } = await supabase
        .from('registrations')
        .select('id')
        .eq('tally_submission_id', body.tally_submission_id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { status: 'duplicate', message: 'Submission already processed' },
          { status: 200 },
        );
      }
    }

    const submittedDate = body.submitted_at ? new Date(body.submitted_at) : new Date();
    const submittedYear = submittedDate.getFullYear();

    const [monthId, familyId] = await Promise.all([
      resolveMonthId(supabase, body.mes, submittedYear),
      findOrCreateFamily(supabase, body),
    ]);

    const names = normalizeStringArray(body.criancas_nomes);
    const dobs = normalizeStringArray(body.criancas_nascimentos);
    const children = names.map((name, i) => ({
      name,
      dob: dobs[i] || null,
    }));

    const parsed = body.plano ? parsePlan(body.plano) : null;

    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .insert({
        family_id: familyId,
        month_id: monthId,
        month: body.mes ?? '',
        year: submittedYear,
        status: 'pendente',
        tally_submission_id: body.tally_submission_id ?? null,
        submitted_at: body.submitted_at ?? null,
        plan: body.plano ?? '',
        unit_price: parsed?.unitPrice ?? 0,
        num_sessions: parsed?.numSessions ?? 0,
        num_children: children.length || 1,
        total_price: parsed?.unitPrice ?? 0,
        has_photos: parsed?.hasPhotos ?? false,
        selected_dates: body.datas_selecionadas ?? [],
        image_consent: body.consentimento ?? null,
        nif: body.nif ?? null,
        voucher_code: body.voucher ?? null,
        notes: body.notas ?? null,
      })
      .select('id')
      .single();

    if (regError || !registration) {
      throw new Error(`Failed to create registration: ${regError?.message}`);
    }

    if (children.length > 0) {
      await supabase.from('children').insert(
        children.map((c) => ({
          registration_id: registration.id,
          name: c.name,
          date_of_birth: c.dob ?? null,
        })),
      );
    }

    return NextResponse.json(
      { status: 'created', registration_id: registration.id, family_id: familyId },
      { status: 201 },
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}
