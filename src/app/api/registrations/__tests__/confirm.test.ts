import { NextRequest } from 'next/server';

type Row = Record<string, unknown>;
type Db = Record<string, Row[]>;

function createFakeSupabase(db: Db) {
  function from(table: string) {
    const rows = db[table] ?? (db[table] = []);
    const filters: [string, unknown][] = [];
    const orders: [string, boolean][] = [];
    let limit: number | undefined;

    function applyFilters(): Row[] {
      let result = rows.filter((row) => filters.every(([col, val]) => row[col] === val));
      for (const [col, ascending] of orders) {
        result = [...result].sort((a, b) => {
          const av = a[col] as number;
          const bv = b[col] as number;
          return ascending ? av - bv : bv - av;
        });
      }
      if (limit !== undefined) result = result.slice(0, limit);
      return result;
    }

    const builder = {
      select() {
        return builder;
      },
      eq(col: string, val: unknown) {
        filters.push([col, val]);
        return builder;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        orders.push([col, opts?.ascending ?? true]);
        return builder;
      },
      limit(n: number) {
        limit = n;
        return builder;
      },
      async maybeSingle() {
        const result = applyFilters();
        return { data: result[0] ?? null, error: null };
      },
      insert(payload: Row | Row[]) {
        const items = Array.isArray(payload) ? payload : [payload];
        const inserted = items.map((item, i) => ({
          id: `${table}-${rows.length + i + 1}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...item,
        }));
        rows.push(...inserted);
        const result = { data: Array.isArray(payload) ? inserted : inserted[0], error: null };
        return {
          select() {
            return {
              async single() {
                return { data: inserted[0], error: null };
              },
            };
          },
          then(resolve: (value: typeof result) => unknown) {
            return Promise.resolve(result).then(resolve);
          },
        };
      },
      update(payload: Row) {
        return {
          async eq(col: string, val: unknown) {
            const idx = rows.findIndex((row) => row[col] === val);
            if (idx >= 0) rows[idx] = { ...rows[idx], ...payload };
            return { data: null, error: null };
          },
        };
      },
    };

    return builder;
  }

  return { from };
}

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));

import { createServerClient } from '@/lib/supabase/server';
import { POST } from '../confirm/route';

const WEBHOOK_SECRET = 'test-secret';

function buildRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('https://example.com/api/registrations/confirm', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-webhook-secret': WEBHOOK_SECRET,
    },
    body: JSON.stringify(body),
  });
}

const basePayload = {
  tally_submission_id: 'sub-1',
  submitted_at: '2026-07-27T12:05:02.000Z',
  source: '(A) Crias na Floresta- Inscrições Julho',
  form_id: 'aQ0Xyb',
  mes: 'julho',
  email: 'familia@example.com',
  is_existing_family: true,
  nome: null,
  telefone: null,
  criancas_nomes: null,
  criancas_nascimentos: null,
  plano: '1 sessão (14€)',
  datas_selecionadas: '19 (tarde)',
  consentimento: 'Sim, autorizo',
  nif: null,
  voucher: null,
  notas: null,
  brevo_flag: 'not_found',
};

describe('POST /api/registrations/confirm — brevo_flag not_found', () => {
  let db: Db;

  beforeEach(() => {
    process.env.WEBHOOK_SECRET = WEBHOOK_SECRET;
    db = { registrations: [], families: [], children: [], unmatched_submissions: [], months: [] };
    (createServerClient as jest.Mock).mockReturnValue(createFakeSupabase(db));
  });

  it('creates an unmatched submission and does not create a registration', async () => {
    const response = await POST(buildRequest(basePayload));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ status: 'unmatched', submission_id: expect.any(String) });

    expect(db.unmatched_submissions).toHaveLength(1);
    const row = db.unmatched_submissions[0];
    expect(row).toMatchObject({
      email: 'familia@example.com',
      plan: '1 sessão (14€)',
      selected_dates: ['19 (tarde)'],
      review_status: 'pending',
      tally_submission_id: 'sub-1',
    });
  });

  it('does not create family, registration, or children records', async () => {
    await POST(buildRequest(basePayload));

    expect(db.families).toHaveLength(0);
    expect(db.registrations).toHaveLength(0);
    expect(db.children).toHaveLength(0);
  });

  it('dedups a repeat not_found submission against unmatched_submissions', async () => {
    await POST(buildRequest(basePayload));
    const second = await POST(buildRequest(basePayload));
    const body = await second.json();

    expect(second.status).toBe(200);
    expect(body).toEqual({ status: 'duplicate', tally_submission_id: 'sub-1' });
    expect(db.unmatched_submissions).toHaveLength(1);
  });

  it('dedups a not_found submission against an existing registration', async () => {
    db.registrations.push({ id: 'reg-existing', tally_submission_id: 'sub-2' });

    const response = await POST(buildRequest({ ...basePayload, tally_submission_id: 'sub-2' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: 'duplicate', tally_submission_id: 'sub-2' });
    expect(db.unmatched_submissions).toHaveLength(0);
  });
});
