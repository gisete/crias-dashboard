import { assignSessionPhotos } from '../sessions-sync';

interface SessionChildRow {
  id: string;
  registration_id: string;
  session_id: string;
  has_photos: boolean;
}

interface SessionRow {
  id: string;
  date: string;
}

interface RegistrationRow {
  id: string;
  foto_sessions: number | null;
}

interface Db {
  registrations: RegistrationRow[];
  session_children: SessionChildRow[];
  sessions: SessionRow[];
}

function createFakeSupabase(db: Db) {
  function from(table: keyof Db) {
    return {
      select(cols: string) {
        return {
          eq(col: string, val: unknown) {
            const rows = db[table] as unknown as Record<string, unknown>[];
            const filtered = rows.filter((r) => r[col] === val);
            const withJoins =
              table === 'session_children' && cols.includes('sessions(date)')
                ? filtered.map((r) => {
                    const row = r as unknown as SessionChildRow;
                    const session = db.sessions.find((s) => s.id === row.session_id);
                    return { id: row.id, sessions: session ? { date: session.date } : null };
                  })
                : filtered;
            return {
              async maybeSingle() {
                return { data: withJoins[0] ?? null, error: null };
              },
              then(resolve: (value: { data: unknown; error: null }) => unknown) {
                return Promise.resolve({ data: withJoins, error: null }).then(resolve);
              },
            };
          },
        };
      },
      update(payload: Record<string, unknown>) {
        return {
          async eq(col: string, val: unknown) {
            const rows = db[table] as unknown as Record<string, unknown>[];
            rows.forEach((r) => {
              if (r[col] === val) Object.assign(r, payload);
            });
            return { data: null, error: null };
          },
          async in(col: string, vals: unknown[]) {
            const set = new Set(vals);
            const rows = db[table] as unknown as Record<string, unknown>[];
            rows.forEach((r) => {
              if (set.has(r[col])) Object.assign(r, payload);
            });
            return { data: null, error: null };
          },
        };
      },
    };
  }

  return { from } as unknown as Parameters<typeof assignSessionPhotos>[0];
}

function buildDb(fotoSessions: number | null): Db {
  return {
    registrations: [{ id: 'reg-1', foto_sessions: fotoSessions }],
    sessions: [
      { id: 'sess-5', date: '5' },
      { id: 'sess-12', date: '12' },
      { id: 'sess-19', date: '19' },
    ],
    session_children: [
      { id: 'sc-5', registration_id: 'reg-1', session_id: 'sess-5', has_photos: false },
      { id: 'sc-12', registration_id: 'reg-1', session_id: 'sess-12', has_photos: false },
      { id: 'sc-19', registration_id: 'reg-1', session_id: 'sess-19', has_photos: false },
    ],
  };
}

describe('assignSessionPhotos — manually added photo sessions', () => {
  it('marks the first N chronological sessions as has_photos when foto_sessions > 0 on a no-photos plan', async () => {
    const db = buildDb(2);
    const supabase = createFakeSupabase(db);

    await assignSessionPhotos(supabase, 'reg-1');

    expect(db.session_children.find((r) => r.id === 'sc-5')!.has_photos).toBe(true);
    expect(db.session_children.find((r) => r.id === 'sc-12')!.has_photos).toBe(true);
    expect(db.session_children.find((r) => r.id === 'sc-19')!.has_photos).toBe(false);
  });

  it('clears has_photos on every session_children row when foto_sessions is set back to 0', async () => {
    const db = buildDb(0);
    db.session_children.forEach((r) => (r.has_photos = true));
    const supabase = createFakeSupabase(db);

    await assignSessionPhotos(supabase, 'reg-1');

    expect(db.session_children.every((r) => r.has_photos === false)).toBe(true);
  });
});
