import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { parseDateOfBirth } from '@/lib/date-parser';
import { removeChildrenFromUpcomingSessions, syncSessionEntries } from '@/lib/data/sessions-sync';
import {
  callBrevoLookup,
  splitList,
  unwrapDob,
  pairChildrenToNames,
  BrevoLookupError,
  type MakeResyncResponse,
} from '@/lib/brevo-sync';

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
    .select(
      'id, status, selected_dates, unit_price, family:families(id, email, parent_name, phone)',
    )
    .eq('id', id)
    .maybeSingle();

  if (regError) {
    return NextResponse.json({ error: regError.message }, { status: 500 });
  }
  if (!registration) {
    return NextResponse.json({ error: 'Inscrição não encontrada.' }, { status: 404 });
  }

  const family = registration.family as unknown as {
    id: string;
    email: string;
    parent_name: string;
    phone: string | null;
  } | null;

  if (!family) {
    return NextResponse.json({ error: 'Família não encontrada.' }, { status: 404 });
  }

  let payload: MakeResyncResponse | null;
  try {
    payload = await callBrevoLookup(family.email);
  } catch (error) {
    if (error instanceof BrevoLookupError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  if (!payload) {
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

  let updatedFamily: { parent_name: string; phone: string | null } | null = {
    parent_name: family.parent_name,
    phone: family.phone,
  };

  if (Object.keys(familyUpdates).length > 0) {
    const { data } = await supabase
      .from('families')
      .update(familyUpdates)
      .eq('id', family.id)
      .select('parent_name, phone')
      .maybeSingle();
    updatedFamily = data ?? updatedFamily;
  }

  // --- Children update, matched in-place by position ---
  const newNames = splitList(payload.CHILD_NAME);
  const newDobsRaw = splitList(unwrapDob(payload.CHILD_DOB));
  const newDobs = newDobsRaw.map((d) => parseDateOfBirth(d));

  const { data: existingChildren } = await supabase
    .from('children')
    .select('id, name, date_of_birth')
    .eq('registration_id', id)
    .is('removed_at', null)
    .order('created_at', { ascending: true });

  const existing = existingChildren ?? [];
  let childrenCount = existing.length;
  let totalPrice: number | undefined;

  // An empty name list means Brevo returned nothing useful — leave the roster
  // alone rather than emptying it on a lookup hiccup.
  if (newNames.length > 0) {
    if (newNames.length !== existing.length) {
      console.warn(
        `Resync child count mismatch for registration ${id}: existing=${existing.length}, new=${newNames.length}`,
      );
    }

    const { pairs, removed } = pairChildrenToNames(existing, newNames);

    for (let i = 0; i < newNames.length; i++) {
      const name = newNames[i];
      const dob = newDobs[i] ?? null;
      const target = pairs[i];

      if (target) {
        await supabase
          .from('children')
          .update({
            name,
            // Only overwrite when Brevo actually supplied a parseable date,
            // matching how parent_name/phone behave above.
            date_of_birth: dob ?? target.date_of_birth,
          })
          .eq('id', target.id);
      } else {
        await supabase.from('children').insert({
          registration_id: id,
          name,
          date_of_birth: dob,
        });
      }
    }

    // Whatever Brevo no longer lists. Soft-removed rather than deleted: a real
    // delete cascades through session_children and would erase past attendance.
    // Skipping this is what left a stale row holding a surviving child's name —
    // the duplicate-name bug.
    const removedIds = removed.map((c) => c.id as string);
    if (removedIds.length > 0) {
      await supabase
        .from('children')
        .update({ removed_at: new Date().toISOString() })
        .in('id', removedIds);

      await removeChildrenFromUpcomingSessions(removedIds);
    }

    childrenCount = newNames.length;
    totalPrice = (registration.unit_price as number) * childrenCount;

    await supabase
      .from('registrations')
      .update({ num_children: childrenCount, total_price: totalPrice })
      .eq('id', id);

    // Newly added children have no session rows yet. Safe after the removal
    // above, since session syncing now skips removed children.
    if (registration.status === 'pago_confirmado') {
      await syncSessionEntries(id, (registration.selected_dates as string[]) ?? []);
    }
  }

  const { data: finalChildren } = await supabase
    .from('children')
    .select('id, registration_id, name, date_of_birth, removed_at, created_at')
    .eq('registration_id', id)
    .is('removed_at', null)
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
    total_price: totalPrice,
  });
}
