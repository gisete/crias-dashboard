import { createServerClient } from '@/lib/supabase/server';
import type { RegistrationStatus } from '@/types/database';

export interface WebhookRegistration {
  id: string;
  month: string;
  year: number;
  plan: string;
  unit_price: number;
  total_price: number;
  num_sessions: number;
  num_children: number;
  has_photos: boolean;
  selected_dates: string[];
  nif: string | null;
  voucher_code: string | null;
  notes: string | null;
}

export interface WebhookFamily {
  parent_name: string;
  email: string;
  phone: string | null;
}

export interface WebhookChild {
  name: string;
  date_of_birth: string | null;
}

export interface StatusWebhookPayload {
  status: RegistrationStatus;
  registration_id: string;
  responsavel_nome: string;
  responsavel_email: string;
  responsavel_telefone: string | null;
  criancas_nomes: string;
  mes: string;
  year: number;
  plano: string;
  unit_price: number;
  total_price: number;
  num_sessions: number;
  num_children: number;
  has_photos: boolean;
  datas_selecionadas: string;
  nif: string | null;
  voucher_code: string | null;
  notas: string | null;
}

/**
 * Pure payload builder — kept free of I/O so it can be unit tested without
 * mocking Supabase or fetch.
 */
export function buildStatusWebhookPayload(
  registration: WebhookRegistration,
  family: WebhookFamily,
  children: WebhookChild[],
  status: RegistrationStatus,
): StatusWebhookPayload {
  return {
    status,
    registration_id: registration.id,
    responsavel_nome: family.parent_name,
    responsavel_email: family.email,
    responsavel_telefone: family.phone,
    criancas_nomes: children.map((c) => c.name).join(', '),
    mes: registration.month,
    year: registration.year,
    plano: registration.plan,
    unit_price: registration.unit_price,
    total_price: registration.total_price,
    num_sessions: registration.num_sessions,
    num_children: registration.num_children,
    has_photos: registration.has_photos,
    datas_selecionadas: registration.selected_dates.join(', '),
    nif: registration.nif,
    voucher_code: registration.voucher_code,
    notas: registration.notes,
  };
}

interface FetchedRegistration extends WebhookRegistration {
  family: WebhookFamily | null;
  children: WebhookChild[] | null;
}

/**
 * Fetches the registration + family + children, builds the payload, and
 * POSTs it to MAKE_WEBHOOK_URL. Throws a descriptive error on any failure —
 * the caller (the status route) decides how to record it.
 */
export async function sendStatusWebhook(
  registrationId: string,
  newStatus: RegistrationStatus,
): Promise<void> {
  const url = process.env.MAKE_WEBHOOK_URL;
  if (!url) {
    console.warn('MAKE_WEBHOOK_URL não está definido — a ignorar o webhook de notificação.');
    return;
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('registrations')
    .select(
      'id, month, year, plan, unit_price, total_price, num_sessions, num_children, has_photos, selected_dates, nif, voucher_code, notes, family:families(parent_name, email, phone), children(name, date_of_birth)',
    )
    .eq('id', registrationId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Failed to fetch registration ${registrationId} for webhook: ${error?.message ?? 'not found'}`);
  }

  const registration = data as unknown as FetchedRegistration;

  if (!registration.family) {
    throw new Error(`Registration ${registrationId} has no associated family`);
  }

  const payload = buildStatusWebhookPayload(
    registration,
    registration.family,
    registration.children ?? [],
    newStatus,
  );

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    throw new Error(`Failed to reach Make webhook: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    throw new Error(`Make webhook responded with status ${response.status}`);
  }
}
