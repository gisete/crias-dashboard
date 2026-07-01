import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { parseDateOfBirth } from '@/lib/date-parser';

interface MakeResyncResponse {
  FIRSTNAME?: string;
  TEL_SMS?: string;
  CHILD_NAME?: string;
  CHILD_DOB?: string;
}

function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const webhookUrl = process.env.MAKE_RESYNC_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { error: 'MAKE_RESYNC_WEBHOOK_URL não está configurado.' },
      { status: 500 },
    );
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: registration, error: regError } = await supabase
    .from('registrations')
    .select('id, family_id')
    .eq('id', id)
    .maybeSingle();

  if (regError) {
    return NextResponse.json({ error: regError.message }, { status: 500 });
  }
  if (!registration) {
    return NextResponse.json({ error: 'Inscrição não encontrada.' }, { status: 404 });
  }

  const { data: family, error: familyError } = await supabase
    .from('families')
    .select('id, email, parent_name, phone')
    .eq('id', registration.family_id)
    .maybeSingle();

  if (familyError) {
    return NextResponse.json({ error: familyError.message }, { status: 500 });
  }
  if (!family) {
    return NextResponse.json({ error: 'Família não encontrada.' }, { status: 404 });
  }

  let makeResponse: Response;
  try {
    makeResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: family.email }),
    });
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível contactar o serviço de sincronização.' },
      { status: 502 },
    );
  }

  if (!makeResponse.ok) {
    return NextResponse.json(
      { error: `O serviço de sincronização respondeu com erro (${makeResponse.status}).` },
      { status: 502 },
    );
  }

  let payload: MakeResyncResponse;
  try {
    payload = await makeResponse.json();
  } catch {
    return NextResponse.json(
      { error: 'Resposta inválida do serviço de sincronização.' },
      { status: 502 },
    );
  }

  const hasAnyField =
    payload.FIRSTNAME !== undefined ||
    payload.TEL_SMS !== undefined ||
    payload.CHILD_NAME !== undefined ||
    payload.CHILD_DOB !== undefined;

  if (!hasAnyField) {
    return NextResponse.json(
      { error: 'A resposta do Brevo não contém os dados esperados.' },
      { status: 502 },
    );
  }

  // --- Family update (email is the lookup key, never overwritten here) ---
  const familyUpdates: Record<string, string> = {};
  if (payload.FIRSTNAME && payload.FIRSTNAME.trim()) {
    familyUpdates.parent_name = payload.FIRSTNAME.trim();
  }
  if (payload.TEL_SMS && payload.TEL_SMS.trim()) {
    familyUpdates.phone = payload.TEL_SMS.trim();
  }

  if (Object.keys(familyUpdates).length > 0) {
    await supabase.from('families').update(familyUpdates).eq('id', family.id);
  }

  const { data: updatedFamily } = await supabase
    .from('families')
    .select('parent_name, phone')
    .eq('id', family.id)
    .maybeSingle();

  // --- Children update, matched in-place by position ---
  const newNames = splitList(payload.CHILD_NAME);
  const newDobsRaw = splitList(payload.CHILD_DOB);
  const newDobs = newDobsRaw.map((d) => parseDateOfBirth(d));

  const { data: existingChildren } = await supabase
    .from('children')
    .select('id, name, date_of_birth')
    .eq('registration_id', id)
    .order('created_at', { ascending: true });

  const existing = existingChildren ?? [];
  let childrenCount = existing.length;

  if (newNames.length > 0) {
    if (newNames.length !== existing.length) {
      console.warn(
        `Resync child count mismatch for registration ${id}: existing=${existing.length}, new=${newNames.length}`,
      );
    }

    for (let i = 0; i < newNames.length; i++) {
      const name = newNames[i];
      const dob = newDobs[i] ?? null;

      if (existing[i]) {
        await supabase
          .from('children')
          .update({ name, date_of_birth: dob })
          .eq('id', existing[i].id);
      } else {
        await supabase.from('children').insert({
          registration_id: id,
          name,
          date_of_birth: dob,
        });
      }
    }

    childrenCount = newNames.length;

    await supabase.from('registrations').update({ num_children: childrenCount }).eq('id', id);
  }

  const { data: finalChildren } = await supabase
    .from('children')
    .select('id, registration_id, name, date_of_birth, created_at')
    .eq('registration_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    success: true,
    updated: {
      parentName: updatedFamily?.parent_name ?? null,
      phone: updatedFamily?.phone ?? null,
      childrenCount,
    },
    family: updatedFamily ?? null,
    children: finalChildren ?? [],
  });
}
