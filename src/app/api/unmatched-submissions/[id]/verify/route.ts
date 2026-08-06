import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { parseDateOfBirth } from '@/lib/date-parser';
import { callBrevoLookup, splitList, unwrapDob, BrevoLookupError } from '@/lib/brevo-sync';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

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

  let email = submission.email as string;
  const newEmail = body.email?.trim().toLowerCase();
  if (newEmail && newEmail !== email) {
    email = newEmail;
    await supabase.from('unmatched_submissions').update({ email }).eq('id', id);
  }

  let payload;
  try {
    payload = await callBrevoLookup(email);
  } catch (error) {
    if (error instanceof BrevoLookupError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }

  if (!payload) {
    return NextResponse.json({ success: true, found: false }, { status: 200 });
  }

  const childNames = splitList(payload.CHILD_NAME);
  const childDobs = splitList(unwrapDob(payload.CHILD_DOB)).map((d) => parseDateOfBirth(d));

  const { data: existingFamily } = await supabase
    .from('families')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  let familyId: string;
  if (existingFamily) {
    const updates: Record<string, string> = {};
    if (payload.FIRSTNAME && payload.FIRSTNAME.trim()) updates.parent_name = payload.FIRSTNAME.trim();
    if (payload.TEL_SMS && payload.TEL_SMS.trim()) updates.phone = payload.TEL_SMS.trim();
    if (Object.keys(updates).length > 0) {
      await supabase.from('families').update(updates).eq('id', existingFamily.id);
    }
    familyId = existingFamily.id;
  } else {
    const { data: created, error: createError } = await supabase
      .from('families')
      .insert({
        email,
        parent_name: payload.FIRSTNAME?.trim() ?? '',
        phone: payload.TEL_SMS?.trim() ?? null,
      })
      .select('id')
      .single();

    if (createError || !created) {
      return NextResponse.json({ error: 'Falha ao criar família.' }, { status: 500 });
    }
    familyId = created.id;
  }

  const { data: registration, error: regError } = await supabase
    .from('registrations')
    .insert({
      family_id: familyId,
      month_id: submission.month_id,
      month: submission.month,
      year: submission.year,
      status: 'pendente',
      tally_submission_id: submission.tally_submission_id,
      submitted_at: submission.submitted_at,
      plan: submission.plan,
      unit_price: submission.unit_price,
      num_sessions: submission.num_sessions,
      has_photos: submission.has_photos,
      foto_sessions: submission.has_photos ? submission.num_sessions : 0,
      num_children: childNames.length || 1,
      total_price: submission.unit_price * (childNames.length || 1),
      selected_dates: submission.selected_dates,
      image_consent: submission.image_consent,
      nif: submission.nif,
      voucher_code: submission.voucher_code,
      notes: submission.notes,
    })
    .select('id')
    .single();

  if (regError || !registration) {
    return NextResponse.json({ error: 'Falha ao criar inscrição.' }, { status: 500 });
  }

  if (childNames.length > 0) {
    await supabase.from('children').insert(
      childNames.map((name, i) => ({
        registration_id: registration.id,
        name,
        date_of_birth: childDobs[i] ?? null,
      })),
    );
  }

  await supabase.from('unmatched_submissions').delete().eq('id', id);

  return NextResponse.json(
    { success: true, found: true, registration_id: registration.id },
    { status: 200 },
  );
}
