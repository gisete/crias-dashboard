import { NextRequest } from 'next/server';

type Row = Record<string, unknown>;

function createFakeSupabase(rows: Row[]) {
  function from(table: string) {
    if (table !== 'registrations') throw new Error(`Unexpected table ${table}`);
    return {
      select() {
        return {
          eq(col: string, val: unknown) {
            return {
              async maybeSingle() {
                const row = rows.find((r) => r[col] === val) ?? null;
                return { data: row, error: null };
              },
            };
          },
        };
      },
      update(payload: Row) {
        return {
          async eq(col: string, val: unknown) {
            const idx = rows.findIndex((r) => r[col] === val);
            if (idx >= 0) rows[idx] = { ...rows[idx], ...payload };
            return { data: null, error: null };
          },
        };
      },
    };
  }
  return { from };
}

jest.mock('@/lib/supabase/server', () => ({ createServerClient: jest.fn() }));
jest.mock('@/lib/data/sessions-sync', () => ({
  createSessionEntries: jest.fn(),
  removeSessionEntries: jest.fn(),
}));
jest.mock('@/lib/make-webhook', () => ({ sendStatusWebhook: jest.fn() }));

import { createServerClient } from '@/lib/supabase/server';
import { createSessionEntries, removeSessionEntries } from '@/lib/data/sessions-sync';
import { sendStatusWebhook } from '@/lib/make-webhook';
import { PATCH } from '../[id]/status/route';

function buildRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('https://example.com/api/registrations/reg-1/status', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function buildRow(overrides: Row = {}): Row {
  return {
    id: 'reg-1',
    status: 'pendente',
    webhook_error: false,
    webhook_error_message: null,
    month: 'julho',
    plan: '1 sessão (14€)',
    unit_price: 14,
    num_sessions: 1,
    num_children: 1,
    selected_dates: ['5 (manhã)'],
    family: { parent_name: 'Maria Silva', email: 'maria@example.com', phone: '912345678' },
    children: [{ name: 'Ana', removed_at: null }],
    ...overrides,
  };
}

describe('PATCH /api/registrations/[id]/status — data completeness gate', () => {
  let rows: Row[];

  beforeEach(() => {
    jest.clearAllMocks();
    rows = [buildRow()];
    (createServerClient as jest.Mock).mockReturnValue(createFakeSupabase(rows));
  });

  it('blocks with 422 and writes nothing when a required field is missing', async () => {
    rows[0].family = { parent_name: '', email: 'maria@example.com', phone: null };

    const response = await PATCH(buildRequest({ status: 'a_pagar' }), { params: Promise.resolve({ id: 'reg-1' }) });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toEqual({
      error: 'dados_em_falta',
      message: 'Faltam dados: Nome do responsável.',
      missing: [{ field: 'parent_name', label: 'Nome do responsável' }],
    });
    expect(rows[0].status).toBe('pendente');
    expect(createSessionEntries).not.toHaveBeenCalled();
    expect(removeSessionEntries).not.toHaveBeenCalled();
    expect(sendStatusWebhook).not.toHaveBeenCalled();
  });

  it('blocks a pago_confirmado transition missing selected dates and does not create session entries', async () => {
    rows[0] = buildRow({ status: 'a_pagar', selected_dates: [] });

    const response = await PATCH(buildRequest({ status: 'pago_confirmado' }), { params: Promise.resolve({ id: 'reg-1' }) });

    expect(response.status).toBe(422);
    expect(createSessionEntries).not.toHaveBeenCalled();
    expect(rows[0].status).toBe('a_pagar');
  });

  it('allows the transition and sends the webhook when every required field is present', async () => {
    const response = await PATCH(buildRequest({ status: 'a_pagar' }), { params: Promise.resolve({ id: 'reg-1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(rows[0].status).toBe('a_pagar');
    expect(sendStatusWebhook).toHaveBeenCalledWith('reg-1', 'a_pagar');
  });

  it('allows a silent pago_confirmado transition with only child name and dates present, skips the webhook, and syncs sessions', async () => {
    rows[0] = buildRow({
      status: 'a_pagar',
      family: { parent_name: '', email: '', phone: null },
      month: '',
      plan: '',
    });

    const response = await PATCH(
      buildRequest({ status: 'pago_confirmado', silent: true }),
      { params: Promise.resolve({ id: 'reg-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(rows[0].status).toBe('pago_confirmado');
    expect(createSessionEntries).toHaveBeenCalledWith('reg-1');
    expect(sendStatusWebhook).not.toHaveBeenCalled();
  });
});
