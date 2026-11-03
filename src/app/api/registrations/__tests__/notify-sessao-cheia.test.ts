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

describe('POST /api/registrations/[id]/notify-sessao-cheia — picked days', () => {
  let rows: Row[];
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.MAKE_WEBHOOK_URL = 'https://make.example.com/webhook';
    rows = [
      buildRow({
        plan: '3 sessões (36€)',
        unit_price: 12,
        total_price: 36,
        num_sessions: 3,
        selected_dates: ['5 (manhã)', '12 (tarde)', '19 (manhã)'],
      }),
    ];
    (createServerClient as jest.Mock).mockReturnValue(createFakeSupabase(rows));
    fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  async function post(body: Record<string, unknown> | undefined) {
    const response = await POST(buildRequest(body), { params: Promise.resolve({ id: 'reg-1' }) });
    return { response, json: await response.json() };
  }

  function sentPayload(): Record<string, unknown> {
    return JSON.parse(fetchMock.mock.calls[0][1].body);
  }

  it('sends one valid day in the single-day format with num_dias 1', async () => {
    const { response } = await post({ dates: ['5 (manhã)'] });

    expect(response.status).toBe(200);
    expect(sentPayload()).toMatchObject({
      status: 'sessao_cheia',
      sessao_cheia_data: '5 de julho (manhã)',
      sessao_cheia_num_dias: 1,
    });
  });

  it('joins two valid days with " e "', async () => {
    const { response } = await post({ dates: ['5 (manhã)', '12 (tarde)'] });

    expect(response.status).toBe(200);
    expect(sentPayload()).toMatchObject({
      sessao_cheia_data: '5 de julho (manhã) e 12 de julho (tarde)',
      sessao_cheia_num_dias: 2,
    });
  });

  it('joins three days as a comma list ending in " e "', async () => {
    const { response } = await post({ dates: ['5 (manhã)', '12 (tarde)', '19 (manhã)'] });

    expect(response.status).toBe(200);
    expect(sentPayload()).toMatchObject({
      sessao_cheia_data: '5 de julho (manhã), 12 de julho (tarde) e 19 de julho (manhã)',
      sessao_cheia_num_dias: 3,
    });
  });

  it('rejects the whole request when one day is not on the registration', async () => {
    const { response, json } = await post({ dates: ['5 (manhã)', '30 (tarde)'] });

    expect(response.status).toBe(400);
    expect(json.error).toBe('Data selecionada inválida.');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(rows[0].sessao_cheia_notified_at).toBeUndefined();
  });

  it('sends an empty sessao_cheia_data and num_dias 0 when no days are given', async () => {
    const { response } = await post({ dates: [] });

    expect(response.status).toBe(200);
    expect(sentPayload()).toMatchObject({ sessao_cheia_data: '', sessao_cheia_num_dias: 0 });
  });

  it('still accepts the legacy single "date" body', async () => {
    const { response } = await post({ date: '12 (tarde)' });

    expect(response.status).toBe(200);
    expect(sentPayload()).toMatchObject({
      sessao_cheia_data: '12 de julho (tarde)',
      sessao_cheia_num_dias: 1,
    });
  });

  it('sends a duplicated day only once', async () => {
    const { response } = await post({ dates: ['5 (manhã)', ' 5 (manhã) ', '5 (manhã)'] });

    expect(response.status).toBe(200);
    expect(sentPayload()).toMatchObject({
      sessao_cheia_data: '5 de julho (manhã)',
      sessao_cheia_num_dias: 1,
    });
  });
});
