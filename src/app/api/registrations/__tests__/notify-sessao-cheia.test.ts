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

import { createServerClient } from '@/lib/supabase/server';
import { POST } from '../[id]/notify-sessao-cheia/route';

function buildRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest('https://example.com/api/registrations/reg-1/notify-sessao-cheia', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function buildRow(overrides: Row = {}): Row {
  return {
    id: 'reg-1',
    month: 'julho',
    year: 2026,
    plan: '1 sessão (14€)',
    unit_price: 14,
    total_price: 14,
    num_sessions: 1,
    num_children: 1,
    has_photos: false,
    selected_dates: ['5 (manhã)'],
    nif: null,
    voucher_code: null,
    notes: null,
    family: { parent_name: 'Maria Silva', email: 'maria@example.com', phone: '912345678' },
    children: [{ name: 'Ana', date_of_birth: null, removed_at: null }],
    ...overrides,
  };
}

describe('POST /api/registrations/[id]/notify-sessao-cheia — data completeness gate', () => {
  let rows: Row[];
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.MAKE_WEBHOOK_URL = 'https://make.example.com/webhook';
    rows = [buildRow()];
    (createServerClient as jest.Mock).mockReturnValue(createFakeSupabase(rows));
    fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('blocks with 422 and does not call the Make webhook when a required field is missing', async () => {
    rows[0].family = { parent_name: '', email: 'maria@example.com', phone: null };

    const response = await POST(buildRequest(), { params: Promise.resolve({ id: 'reg-1' }) });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toEqual({
      error: 'dados_em_falta',
      message: 'Faltam dados: Nome do responsável.',
      missing: [{ field: 'parent_name', label: 'Nome do responsável' }],
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(rows[0].sessao_cheia_notified_at).toBeUndefined();
  });

  it('sends the webhook and records the notification when every required field is present', async () => {
    const response = await POST(buildRequest(), { params: Promise.resolve({ id: 'reg-1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(rows[0].sessao_cheia_notified_at).toBe(body.notified_at);
  });
});
