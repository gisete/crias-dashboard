import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { parsePlan } from '@/lib/plan-parser';
import { parseDateOfBirth } from '@/lib/date-parser';
import { normalizeDateEntry } from '@/lib/date-utils';
import { MONTH_TO_NUMBER } from '@/lib/months';

interface ConfirmPayload {
  tally_submission_id: string | null;
  submitted_at: string | null;
  source: string | null;
  form_id: string | null;
  mes: string | null;
  email: string;
  is_existing_family: boolean;
  nome: string | null;
  telefone: string | null;
  criancas_nomes: string | null;
  criancas_nascimentos: string | null;
  plano: string | null;
  datas_selecionadas: string | null;
  consentimento: string | null;
  nif: string | null;
  voucher: string | null;
  notas: string | null;
  brevo_flag: string | null;
}

function normalizeStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
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
  payload: ConfirmPayload,
): Promise<string> {
  const { data: existing } = await supabase
    .from('families')
    .select('id')
    .eq('email', payload.email)
    .maybeSingle();

  if (existing) {
    const updates: Record<string, string> = {};
    if (payload.nome !== null) updates.parent_name = payload.nome;
    if (payload.telefone !== null) updates.phone = payload.telefone;
    if (Object.keys(updates).length > 0) {
      await supabase.from('families').update(updates).eq('id', existing.id);
    }
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from('families')
    .insert({
      email: payload.email,
      parent_name: payload.nome ?? '',
      phone: payload.telefone ?? null,
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: ConfirmPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  }

  body.email = body.email.trim().toLowerCase();

  try {
    const supabase = createServerClient();

    if (body.tally_submission_id) {
      const { data: existing } = await supabase
        .from('registrations')
        .select('id')
        .eq('tally_submission_id', body.tally_submission_id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { status: 'duplicate', tally_submission_id: body.tally_submission_id },
          { status: 200 },
        );
      }
    }

    const submittedDate = body.submitted_at ? new Date(body.submitted_at) : new Date();
    const submittedYear = submittedDate.getFullYear();
    const selectedDates = normalizeStringArray(body.datas_selecionadas).map(normalizeDateEntry);

    const [monthId, familyId] = await Promise.all([
      resolveMonthId(supabase, body.mes, submittedYear),
      findOrCreateFamily(supabase, body),
    ]);

    const names = normalizeStringArray(body.criancas_nomes);
    const dobs = normalizeStringArray(body.criancas_nascimentos);
    const children = names.map((name, i) => ({
      name,
      dob: dobs[i] ? parseDateOfBirth(dobs[i]) : null,
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
        selected_dates: selectedDates,
        image_consent: body.consentimento ?? null,
        nif: body.nif ?? null,
        voucher_code: body.voucher ?? null,
        notes: body.notas ?? null,
        brevo_flag: body.brevo_flag ?? null,
      })
      .select('id')
      .single();

    if (regError || !registration) {
      throw new Error(`Failed to create registration: ${regError?.message}`);
    }

    if (children.length > 0) {
      const { error: childrenError } = await supabase.from('children').insert(
        children.map((c) => ({
          registration_id: registration.id,
          name: c.name,
          date_of_birth: c.dob ?? null,
        })),
      );

      if (childrenError) {
        await supabase
          .from('registrations')
          .update({
            webhook_error: true,
            webhook_error_message: `Erro ao guardar crianças: ${childrenError.message}`,
          })
          .eq('id', registration.id);
      }
    }

    return NextResponse.json(
      { status: 'created', registration_id: registration.id },
      { status: 201 },
    );
  } catch (error) {
    console.error('Confirm error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}
