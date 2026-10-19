# Status Change Data-Completeness Gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block a registration's status change (and the Sessão Cheia notification) whenever data the Make/Brevo webhook needs is missing, instead of letting Make fail with "Missing value of required parameter," and tell the school exactly which fields to fix.

**Architecture:** A single pure validator (`src/lib/registration-validation.ts`) computes a list of missing required fields for a given target status. The status route and the Sessão Cheia route call it server-side before writing anything or firing the webhook, returning HTTP 422 with the missing list when blocked. The client (`RegistrationDetail`, `StatusActions`, `InlineEditField`) calls the same validator to pre-emptively disable actions, show an amber notice, and surface the server's 422 as a specific toast instead of the generic error message. `InlineEditField` additionally refuses to save an empty value for the handful of fields that may never be blank.

**Tech Stack:** Next.js 15 App Router route handlers, TypeScript, `@supabase/supabase-js` (no ORM), Jest + ts-jest.

**Spec:** The full spec is the user's pasted prompt for this task (not a separate file) — reproduced in task descriptions below where it drives a specific decision.

## Global Constraints

- All new/changed UI text is European Portuguese (PT-PT).
- No database migrations, no changes to Make or Brevo, no changes to ingestion routes (`confirm`, `webhook`, unmatched-submissions `verify`).
- Do not gate `src/app/api/unmatched-submissions/[id]/notify/route.ts` (the `email_nao_encontrado` notify route) — mention it in the final summary only.
- `getMissingFields`/`formatMissingFields` live in `src/lib/registration-validation.ts`, pure, no I/O, importable from both server routes and client components.
- Verification for every task: `npx tsc --noEmit`, `npx jest`, `npx eslint <changed files>`. No browser/visual verification — the user tests the UI themselves.

---

## Task 1: Shared validator — `registration-validation.ts`

**Files:**
- Create: `src/lib/registration-validation.ts`
- Test: `src/lib/__tests__/registration-validation.test.ts`

**Interfaces:**
- Produces (used by every later task):
  ```ts
  export interface MissingField { field: string; label: string }
  export interface ValidationFamily { parent_name: string | null; email: string | null; phone?: string | null }
  export interface ValidationChild { name: string | null; removed_at: string | null }
  export interface ValidationRegistration {
    month: string | null;
    plan: string | null;
    unit_price: number;
    num_sessions: number;
    num_children: number;
    selected_dates: string[] | null;
    family: ValidationFamily;
    children: ValidationChild[];
  }
  export function getMissingFields(reg: ValidationRegistration, opts: { target: RegistrationStatus; silent?: boolean }): MissingField[]
  export function formatMissingFields(missing: MissingField[]): string
  ```
- `RegistrationWithDetails` (client) and the server's fetched registration row both satisfy `ValidationRegistration` structurally — no mapper function needed anywhere in this plan.

**Plan-parser finding (verified while writing this task):** `parsePlan` in `src/lib/plan-parser.ts` defaults `unitPrice` to `0` only when the `(N€)` pattern fails to match (a parse failure, never a legitimate plan), and `numSessions` defaults to `1` (never `0`) unless an explicit `mensal N`/`N sessão` match yields it — which no real plan string produces. **No legitimate plan has a zero price or zero sessions**, so the "plan sanity" check needs no exemption list. State this in the final summary.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/registration-validation.test.ts`:

```ts
import { getMissingFields, formatMissingFields, type ValidationRegistration } from '../registration-validation';

function buildReg(overrides: Partial<ValidationRegistration> = {}): ValidationRegistration {
  return {
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

describe('getMissingFields — target pendente', () => {
  it('never reports missing fields regardless of data completeness', () => {
    const reg = buildReg({ family: { parent_name: '', email: '', phone: null }, plan: '' });
    expect(getMissingFields(reg, { target: 'pendente' })).toEqual([]);
  });
});

describe('getMissingFields — full check (non-silent, non-pendente target)', () => {
  it('reports a blank parent name', () => {
    const reg = buildReg({ family: { parent_name: '', email: 'maria@example.com', phone: null } });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'parent_name', label: 'Nome do responsável' },
    ]);
  });

  it('reports a whitespace-only parent name', () => {
    const reg = buildReg({ family: { parent_name: '   ', email: 'maria@example.com', phone: null } });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'parent_name', label: 'Nome do responsável' },
    ]);
  });

  it('reports a blank email', () => {
    const reg = buildReg({ family: { parent_name: 'Maria', email: '', phone: null } });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'email', label: 'Email' },
    ]);
  });

  it('reports an email with no "@"', () => {
    const reg = buildReg({ family: { parent_name: 'Maria', email: 'maria.example.com', phone: null } });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'email', label: 'Email' },
    ]);
  });

  it('reports an email with "@" but no later "."', () => {
    const reg = buildReg({ family: { parent_name: 'Maria', email: 'maria@examplecom', phone: null } });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'email', label: 'Email' },
    ]);
  });

  it('reports a blank month', () => {
    const reg = buildReg({ month: '' });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'month', label: 'Mês' },
    ]);
  });

  it('reports a blank plan', () => {
    const reg = buildReg({ plan: '' });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'plan', label: 'Plano' },
    ]);
  });

  it('reports plan sanity when the plan is set but unit_price is 0', () => {
    const reg = buildReg({ plan: 'Plano desconhecido', unit_price: 0 });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'plan_sanity', label: 'Plano (preço ou n.º de sessões não reconhecido)' },
    ]);
  });

  it('reports plan sanity when the plan is set but num_sessions is 0', () => {
    const reg = buildReg({ num_sessions: 0 });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'plan_sanity', label: 'Plano (preço ou n.º de sessões não reconhecido)' },
    ]);
  });

  it('reports num_children below 1', () => {
    const reg = buildReg({ num_children: 0 });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'num_children', label: 'Número de crianças' },
    ]);
  });

  it('reports missing child name when there are no active children', () => {
    const reg = buildReg({ children: [] });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'child_name', label: 'Nome da criança' },
    ]);
  });

  it('ignores removed children when checking for a named child', () => {
    const reg = buildReg({ children: [{ name: 'Ana', removed_at: '2026-01-01T00:00:00.000Z' }] });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'child_name', label: 'Nome da criança' },
    ]);
  });

  it('reports missing child name when every active child has a blank name', () => {
    const reg = buildReg({ children: [{ name: '  ', removed_at: null }] });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'child_name', label: 'Nome da criança' },
    ]);
  });

  it('reports missing selected dates when the list is empty', () => {
    const reg = buildReg({ selected_dates: [] });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'selected_dates', label: 'Datas selecionadas' },
    ]);
  });

  it('reports missing selected dates when every entry is blank', () => {
    const reg = buildReg({ selected_dates: ['  ', ''] });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'selected_dates', label: 'Datas selecionadas' },
    ]);
  });

  it('reports every missing field together, in order, for a fully empty registration', () => {
    const reg = buildReg({
      family: { parent_name: '', email: '', phone: null },
      month: '',
      plan: '',
      num_children: 0,
      children: [],
      selected_dates: [],
    });
    expect(getMissingFields(reg, { target: 'a_pagar' }).map((m) => m.field)).toEqual([
      'parent_name',
      'email',
      'month',
      'plan',
      'num_children',
      'child_name',
      'selected_dates',
    ]);
  });

  it.each(['a_pagar', 'lembrete', 'pago_confirmado', 'cancelado'] as const)(
    'runs the full check for target %s',
    (target) => {
      const reg = buildReg({ family: { parent_name: '', email: 'maria@example.com', phone: null } });
      expect(getMissingFields(reg, { target })).toEqual([
        { field: 'parent_name', label: 'Nome do responsável' },
      ]);
    },
  );
});

describe('getMissingFields — silent checks', () => {
  it('checks only child name and selected dates for target pago_confirmado', () => {
    const reg = buildReg({
      family: { parent_name: '', email: '', phone: null },
      month: '',
      plan: '',
      children: [],
      selected_dates: [],
    });
    expect(getMissingFields(reg, { target: 'pago_confirmado', silent: true }).map((m) => m.field)).toEqual([
      'child_name',
      'selected_dates',
    ]);
  });

  it('returns nothing for a complete registration at target pago_confirmado', () => {
    const reg = buildReg();
    expect(getMissingFields(reg, { target: 'pago_confirmado', silent: true })).toEqual([]);
  });

  it.each(['a_pagar', 'lembrete', 'cancelado'] as const)(
    'returns nothing for silent target %s regardless of missing data',
    (target) => {
      const reg = buildReg({ family: { parent_name: '', email: '', phone: null }, children: [] });
      expect(getMissingFields(reg, { target, silent: true })).toEqual([]);
    },
  );
});

describe('getMissingFields — complete registration', () => {
  it.each(['pendente', 'a_pagar', 'lembrete', 'pago_confirmado', 'cancelado'] as const)(
    'returns [] for target %s, silent or not',
    (target) => {
      const reg = buildReg();
      expect(getMissingFields(reg, { target, silent: false })).toEqual([]);
      expect(getMissingFields(reg, { target, silent: true })).toEqual([]);
    },
  );
});

describe('formatMissingFields', () => {
  it('formats a single label with no connector', () => {
    expect(formatMissingFields([{ field: 'a', label: 'A' }])).toBe('A');
  });

  it('joins two labels with "e"', () => {
    expect(formatMissingFields([{ field: 'a', label: 'A' }, { field: 'b', label: 'B' }])).toBe('A e B');
  });

  it('joins three or more labels with commas and a final "e"', () => {
    expect(formatMissingFields([
      { field: 'a', label: 'A' },
      { field: 'b', label: 'B' },
      { field: 'c', label: 'C' },
    ])).toBe('A, B e C');
  });

  it('returns an empty string for no missing fields', () => {
    expect(formatMissingFields([])).toBe('');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/lib/__tests__/registration-validation.test.ts`
Expected: FAIL — `Cannot find module '../registration-validation'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/registration-validation.ts`:

```ts
import type { RegistrationStatus } from '@/types/database';

export interface MissingField {
  field: string;
  label: string;
}

export interface ValidationFamily {
  parent_name: string | null;
  email: string | null;
  phone?: string | null;
}

export interface ValidationChild {
  name: string | null;
  removed_at: string | null;
}

export interface ValidationRegistration {
  month: string | null;
  plan: string | null;
  unit_price: number;
  num_sessions: number;
  num_children: number;
  selected_dates: string[] | null;
  family: ValidationFamily;
  children: ValidationChild[];
}

/**
 * Required-field list this module enforces. Must stay in sync with what
 * StatusWebhookPayload (src/lib/make-webhook.ts) needs to build a non-empty
 * customer email: parent_name, email, month, plan (+ its derived price and
 * session count), num_children, at least one active child name, and at
 * least one selected date. Update both places together.
 */
export const REQUIRED_FIELDS = [
  'parent_name',
  'email',
  'month',
  'plan',
  'num_children',
  'child_name',
  'selected_dates',
] as const;

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim() === '';
}

function isMissingEmail(email: string | null | undefined): boolean {
  if (isBlank(email)) return true;
  return !/@.*\./.test(email!.trim());
}

function activeChildrenWithNames(children: ValidationChild[]): ValidationChild[] {
  return children.filter((c) => c.removed_at == null && !isBlank(c.name));
}

function hasSelectedDates(dates: string[] | null): boolean {
  return !!dates && dates.some((d) => !isBlank(d));
}

function checkChildName(reg: ValidationRegistration, missing: MissingField[]): void {
  if (activeChildrenWithNames(reg.children).length === 0) {
    missing.push({ field: 'child_name', label: 'Nome da criança' });
  }
}

function checkSelectedDates(reg: ValidationRegistration, missing: MissingField[]): void {
  if (!hasSelectedDates(reg.selected_dates)) {
    missing.push({ field: 'selected_dates', label: 'Datas selecionadas' });
  }
}

function checkFullRequiredFields(reg: ValidationRegistration, missing: MissingField[]): void {
  if (isBlank(reg.family.parent_name)) {
    missing.push({ field: 'parent_name', label: 'Nome do responsável' });
  }
  if (isMissingEmail(reg.family.email)) {
    missing.push({ field: 'email', label: 'Email' });
  }
  if (isBlank(reg.month)) {
    missing.push({ field: 'month', label: 'Mês' });
  }
  if (isBlank(reg.plan)) {
    missing.push({ field: 'plan', label: 'Plano' });
  } else if (reg.unit_price <= 0 || reg.num_sessions <= 0) {
    missing.push({ field: 'plan_sanity', label: 'Plano (preço ou n.º de sessões não reconhecido)' });
  }
  if (reg.num_children < 1) {
    missing.push({ field: 'num_children', label: 'Número de crianças' });
  }
  checkChildName(reg, missing);
  checkSelectedDates(reg, missing);
}

/**
 * - target 'pendente': never blocks.
 * - target a_pagar | lembrete | pago_confirmado | cancelado, not silent:
 *   every required field (these transitions send the Make webhook).
 * - silent === true: only blocks for target 'pago_confirmado', and only on
 *   child name + selected dates (what createSessionEntries needs); every
 *   other silent target returns [].
 */
export function getMissingFields(
  reg: ValidationRegistration,
  opts: { target: RegistrationStatus; silent?: boolean },
): MissingField[] {
  const { target, silent = false } = opts;

  if (target === 'pendente') return [];

  const missing: MissingField[] = [];

  if (silent) {
    if (target === 'pago_confirmado') {
      checkChildName(reg, missing);
      checkSelectedDates(reg, missing);
    }
    return missing;
  }

  checkFullRequiredFields(reg, missing);
  return missing;
}

/** PT-PT list format: "A", "A e B", or "A, B e C". */
export function formatMissingFields(missing: MissingField[]): string {
  const labels = missing.map((m) => m.label);
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/lib/__tests__/registration-validation.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/registration-validation.ts src/lib/__tests__/registration-validation.test.ts
git commit -m "feat: add registration-validation for status-change data completeness"
```

---

## Task 2: Server enforcement — status route

**Files:**
- Modify: `src/app/api/registrations/[id]/status/route.ts`
- Test: `src/app/api/registrations/__tests__/status.test.ts` (written in Task 4, run here too)

**Interfaces:**
- Consumes: `getMissingFields`, `formatMissingFields`, `ValidationRegistration` from Task 1.
- Produces: on blocked request, `HTTP 422 { error: 'dados_em_falta', message: string, missing: MissingField[] }`; nothing else changes.

- [ ] **Step 1: Extend the select and run the validator before any write**

Replace the full contents of `src/app/api/registrations/[id]/status/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSessionEntries, removeSessionEntries } from '@/lib/data/sessions-sync';
import { sendStatusWebhook } from '@/lib/make-webhook';
import { getMissingFields, formatMissingFields } from '@/lib/registration-validation';
import { ALL_STATUSES } from '@/lib/status-utils';
import type { RegistrationStatus } from '@/types/database';

interface FetchedRegistration {
  status: RegistrationStatus;
  webhook_error: boolean;
  webhook_error_message: string | null;
  month: string;
  plan: string;
  unit_price: number;
  num_sessions: number;
  num_children: number;
  selected_dates: string[];
  family: { parent_name: string; email: string; phone: string | null } | null;
  children: { name: string; removed_at: string | null }[] | null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let status: RegistrationStatus;
  let silent = false;
  try {
    const body = await request.json();
    status = body.status;
    silent = body.silent === true;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!ALL_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data, error: fetchError } = await supabase
    .from('registrations')
    .select(
      'status, webhook_error, webhook_error_message, month, plan, unit_price, num_sessions, num_children, selected_dates, family:families(parent_name, email, phone), children(name, removed_at)',
    )
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
  }

  const current = data as unknown as FetchedRegistration;
  const oldStatus = current.status;

  const missing = getMissingFields(
    {
      month: current.month,
      plan: current.plan,
      unit_price: current.unit_price,
      num_sessions: current.num_sessions,
      num_children: current.num_children,
      selected_dates: current.selected_dates,
      family: current.family ?? { parent_name: null, email: null, phone: null },
      children: current.children ?? [],
    },
    { target: status, silent },
  );

  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: 'dados_em_falta',
        message: `Faltam dados: ${formatMissingFields(missing)}.`,
        missing,
      },
      { status: 422 },
    );
  }

  const { error: updateError } = await supabase
    .from('registrations')
    .update({ status })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  try {
    if (status === 'pago_confirmado' && oldStatus !== 'pago_confirmado') {
      await createSessionEntries(id);
    } else if (oldStatus === 'pago_confirmado' && status !== 'pago_confirmado') {
      await removeSessionEntries(id);
    }
  } catch (error) {
    // The status update already succeeded — surface the partial state
    // instead of a bare 500 so the caller knows sessions are out of sync.
    console.error(`Session sync failed for registration ${id}:`, error);
    return NextResponse.json(
      { error: 'Estado atualizado, mas a sincronização de sessões falhou.' },
      { status: 500 },
    );
  }

  if (status !== 'pendente' && !silent) {
    try {
      await sendStatusWebhook(id, status);

      if (current.webhook_error) {
        await supabase
          .from('registrations')
          .update({ webhook_error: false, webhook_error_message: null })
          .eq('id', id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`Webhook failed for registration ${id}:`, error);
      await supabase
        .from('registrations')
        .update({
          webhook_error: true,
          webhook_error_message: `Erro ao enviar notificação: ${message}`,
        })
        .eq('id', id);
    }
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/registrations/[id]/status/route.ts
git commit -m "feat: block status PATCH when required data is missing"
```

(Tests for this route are written and run together in Task 4, after the Sessão Cheia route also exists — both reuse the same fake-Supabase approach.)

---

## Task 3: Server enforcement — Sessão Cheia route

**Files:**
- Modify: `src/app/api/registrations/[id]/notify-sessao-cheia/route.ts`

**Interfaces:**
- Consumes: `getMissingFields`, `formatMissingFields` from Task 1.
- Produces: same `422 { error: 'dados_em_falta', message, missing }` shape as the status route.

**Why target `'a_pagar'` here:** Sessão Cheia only ever fires while the registration is still `'pendente'` (see `StatusActions` — the button only renders for that status), but it still sends the full Make/Brevo payload. `getMissingFields` treats target `'pendente'` as never blocking, so passing the *actual* status would wrongly skip every check. Passing any of `a_pagar | lembrete | pago_confirmado | cancelado` with `silent: false` produces the identical full-field check (per Task 1's rules) — `'a_pagar'` is used here purely as that non-pendente marker, not as a real status transition.

- [ ] **Step 1: Add the check**

In `src/app/api/registrations/[id]/notify-sessao-cheia/route.ts`, add the import:

```ts
import { getMissingFields, formatMissingFields } from '@/lib/registration-validation';
```

Then, immediately after the existing block:

```ts
  if (!registration.family) {
    return NextResponse.json({ error: 'Registration has no associated family' }, { status: 500 });
  }
```

insert:

```ts
  // Sessão Cheia always fires from a 'pendente' registration but still sends
  // the full webhook payload, so force the full required-field check with a
  // non-pendente target — getMissingFields never blocks target 'pendente'.
  const missing = getMissingFields(
    {
      month: registration.month,
      plan: registration.plan,
      unit_price: registration.unit_price,
      num_sessions: registration.num_sessions,
      num_children: registration.num_children,
      selected_dates: registration.selected_dates,
      family: registration.family,
      children: registration.children ?? [],
    },
    { target: 'a_pagar', silent: false },
  );

  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: 'dados_em_falta',
        message: `Faltam dados: ${formatMissingFields(missing)}.`,
        missing,
      },
      { status: 422 },
    );
  }
```

(leave the existing `pickedDate` validity check and everything after it unchanged, right below this block)

- [ ] **Step 2: Run `npx tsc --noEmit` to confirm the route still type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/registrations/[id]/notify-sessao-cheia/route.ts
git commit -m "feat: block Sessão Cheia notification when required data is missing"
```

---

## Task 4: Status route tests

**Files:**
- Create: `src/app/api/registrations/__tests__/status.test.ts`

**Interfaces:**
- Consumes: `PATCH` from Task 2's route; mocks `createServerClient`, `createSessionEntries`/`removeSessionEntries`, `sendStatusWebhook`.

- [ ] **Step 1: Write the test file**

```ts
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
```

- [ ] **Step 2: Run the tests**

Run: `npx jest src/app/api/registrations/__tests__/status.test.ts`
Expected: PASS, 4 tests green.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/registrations/__tests__/status.test.ts
git commit -m "test: cover status route's data-completeness gate"
```

---

## Task 5: Client data layer — `updateRegistrationStatus` return shape

**Files:**
- Modify: `src/lib/data/registrations.ts:301-312`

**Interfaces:**
- Produces: `UpdateStatusResult { success: boolean; missing?: MissingField[]; message?: string }`, used by Task 8.

- [ ] **Step 1: Add the import and change the function**

Add near the top imports of `src/lib/data/registrations.ts`:

```ts
import type { MissingField } from '@/lib/registration-validation';
```

Replace the existing `updateRegistrationStatus` (lines 301-312):

```ts
export interface UpdateStatusResult {
  success: boolean;
  missing?: MissingField[];
  message?: string;
}

export async function updateRegistrationStatus(
  id: string,
  newStatus: string,
  options?: { silent?: boolean }
): Promise<UpdateStatusResult> {
  const res = await fetch(`/api/registrations/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus, silent: options?.silent ?? false }),
  });

  if (res.ok) return { success: true };

  const data = await res.json().catch(() => ({}));
  return { success: false, missing: data.missing, message: data.message };
}
```

Every existing caller (`RegistrationDetail.applyStatus`, `RegistrationDetail.handleResend`) only reads `result.success` today, so this is a backward-compatible superset — no other caller needs changes in this task.

- [ ] **Step 2: Run `npx tsc --noEmit`**

Expected: no errors (callers still compile against the wider return type).

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/registrations.ts
git commit -m "feat: surface missing-field details from updateRegistrationStatus"
```

---

## Task 6: `InlineEditField` — required-field guard and amber placeholder

**Files:**
- Modify: `src/components/inscricoes/InlineEditField.tsx`

**Interfaces:**
- Produces: new optional prop `required?: boolean` on `InlineEditField`. When true: (a) saving a blank draft is refused, editor stays open, shows "Campo obrigatório"; (b) the collapsed display shows amber "Em falta" instead of "—" when `value` is blank. Saving a non-blank value always works, and non-required fields are unaffected.

- [ ] **Step 1: Apply the change**

Replace the full contents of `src/components/inscricoes/InlineEditField.tsx`:

```tsx
'use client';

import { useState, type ReactNode } from 'react';
import { PencilSimple, Check, X } from '@phosphor-icons/react';

interface Props {
  label?: string;
  value: string | null;
  fieldName: string;
  type?: 'text' | 'select' | 'textarea' | 'date' | 'number';
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  onSave: (fieldName: string, value: string) => Promise<void>;
  /** Custom rendering for the display-mode value (e.g. a derived age line). */
  displayValue?: ReactNode;
  /** Overrides the default text classes for the plain-text display value. */
  valueClassName?: string;
  /** Refuses to save a blank value and shows an amber "Em falta" placeholder when blank. */
  required?: boolean;
}

export function InlineEditField({
  label,
  value,
  fieldName,
  type = 'text',
  options,
  min,
  max,
  step,
  onSave,
  displayValue,
  valueClassName = 'text-body-md text-gray-900',
  required = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (required && draft.trim() === '') {
      setError('Campo obrigatório');
      return;
    }
    setError(null);
    setSaving(true);
    await onSave(fieldName, draft);
    setSaving(false);
    setEditing(false);
  }

  function handleCancel() {
    setDraft(value ?? '');
    setError(null);
    setEditing(false);
  }

  function startEditing() {
    setDraft(value ?? '');
    setError(null);
    setEditing(true);
  }

  if (editing) {
    return (
      <div>
        {label && (
          <span className="block mb-1 text-label-sm text-gray-400 uppercase tracking-wider">{label}</span>
        )}
        <div className="flex items-start gap-2">
          {type === 'textarea' ? (
            <textarea
              className="flex-1 text-body-md border border-surface-container-highest rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              autoFocus
            />
          ) : type === 'select' && options ? (
            <select
              className="flex-1 text-body-md border border-surface-container-highest rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            >
              <option value="">—</option>
              {options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : type === 'date' ? (
            <input
              type="date"
              className="flex-1 text-body-md border border-surface-container-highest rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
          ) : type === 'number' ? (
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              className="flex-1 text-body-md border border-surface-container-highest rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
          ) : (
            <input
              type="text"
              className="flex-1 text-body-md border border-surface-container-highest rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0 mt-0.5"
          >
            <Check size={14} weight="bold" />
          </button>
          <button
            onClick={handleCancel}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-container-highest hover:bg-surface-container text-gray-500 transition-colors shrink-0 mt-0.5"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
        {error && <p className="text-label-sm text-error mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      {label && (
        <span className="block mb-1 text-label-sm text-gray-400 uppercase tracking-wider">{label}</span>
      )}
      <button
        onClick={startEditing}
        className="group inline-flex items-center gap-1.5 w-fit text-left -mx-1.5 -my-0.5 px-1.5 py-0.5 rounded-md hover:bg-surface-container-low transition-colors cursor-pointer"
      >
        {displayValue ? (
          displayValue
        ) : value ? (
          <span className={valueClassName}>{value}</span>
        ) : required ? (
          <span className="text-body-md text-amber-600 font-medium">Em falta</span>
        ) : (
          <span className="text-body-md text-gray-400">—</span>
        )}
        <PencilSimple
          size={14}
          className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Run `npx tsc --noEmit` and `npx eslint src/components/inscricoes/InlineEditField.tsx`**

Expected: no errors (the prop isn't wired to any usage yet — that's Task 8 — so no behavior change until then).

- [ ] **Step 3: Commit**

```bash
git add src/components/inscricoes/InlineEditField.tsx
git commit -m "feat: add required-field guard and Em falta placeholder to InlineEditField"
```

---

## Task 7: `StatusActions` / `SessaoCheiaButton` — `disabledReason`

**Files:**
- Modify: `src/components/inscricoes/StatusActions.tsx`
- Modify: `src/components/inscricoes/SessaoCheiaButton.tsx`

**Interfaces:**
- Produces: `StatusActions` gains `disabledReason?: string`; `SessaoCheiaButton` gains `disabled?: boolean` and `title?: string`. When `disabledReason` is set, every button `StatusActions` renders (its own two action buttons and the nested `SessaoCheiaButton`'s trigger) is disabled with `title={disabledReason}`.

- [ ] **Step 1: Update `SessaoCheiaButton`**

In `src/components/inscricoes/SessaoCheiaButton.tsx`, change the `Props` interface to:

```tsx
interface Props {
  selectedDates: string[];
  month: string;
  sessaoCheiaNotifiedAt: string | null;
  onSessaoCheia: (date: string | null) => Promise<void>;
  disabled?: boolean;
  title?: string;
}
```

and the function signature plus trigger button to:

```tsx
export function SessaoCheiaButton({
  selectedDates,
  month,
  sessaoCheiaNotifiedAt,
  onSessaoCheia,
  disabled = false,
  title,
}: Props) {
  const [loading, setLoading] = useState(false);
  // ...unchanged state/handlers...

  // unchanged "already notified" early return

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading || disabled}
        title={title}
        className={`w-auto flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-3.5 px-5 rounded-xl text-label-md hover:bg-gray-50 transition-colors ${loading || disabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
      >
        {loading ? <CircleNotch size={16} className="animate-spin" /> : <Envelope size={16} weight="fill" />}
        Sessão Cheia
      </button>
      {/* ...rest of the modal JSX unchanged... */}
    </>
  );
}
```

(Only the `Props` interface, the function's destructured params, and the trigger `<button>`'s `disabled`/`title`/class attributes change — the rest of the file, including the modal and the "already notified" branch, is untouched.)

- [ ] **Step 2: Update `StatusActions`**

Replace the full contents of `src/components/inscricoes/StatusActions.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { CheckCircle, Envelope, CircleNotch } from '@phosphor-icons/react';
import type { RegistrationStatus } from '@/types/database';
import { SessaoCheiaButton } from './SessaoCheiaButton';

interface Props {
  status: RegistrationStatus;
  onAction: (newStatus: RegistrationStatus) => Promise<void>;
  hasVoucher: boolean;
  childrenCount: number;
  selectedDates: string[];
  month: string;
  sessaoCheiaNotifiedAt: string | null;
  onSessaoCheia: (date: string | null) => Promise<void>;
  disabledReason?: string;
}

export function StatusActions({
  status,
  onAction,
  hasVoucher,
  childrenCount,
  selectedDates,
  month,
  sessaoCheiaNotifiedAt,
  onSessaoCheia,
  disabledReason,
}: Props) {
  const [loading, setLoading] = useState<RegistrationStatus | null>(null);

  if (status === 'pago_confirmado' || status === 'cancelado') return null;

  async function handleClick(newStatus: RegistrationStatus) {
    setLoading(newStatus);
    try {
      await onAction(newStatus);
    } finally {
      setLoading(null);
    }
  }

  const isDisabled = !!loading || !!disabledReason;
  const disabledClass = isDisabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : '';

  function ActionIcon({ forStatus, icon }: { forStatus: RegistrationStatus; icon: React.ReactNode }) {
    return loading === forStatus ? <CircleNotch size={16} className="animate-spin" /> : icon;
  }

  return (
    <div className="flex flex-row flex-wrap gap-3">
      {status === 'pendente' && (
        <SessaoCheiaButton
          selectedDates={selectedDates}
          month={month}
          sessaoCheiaNotifiedAt={sessaoCheiaNotifiedAt}
          onSessaoCheia={onSessaoCheia}
          disabled={!!disabledReason}
          title={disabledReason}
        />
      )}

      {status === 'pendente' && (
        hasVoucher && childrenCount === 1 ? (
          <button
            onClick={() => handleClick('pago_confirmado')}
            disabled={isDisabled}
            title={disabledReason}
            className={`w-auto flex items-center justify-center gap-2 bg-on-primary-fixed text-white py-3.5 px-5 rounded-xl text-label-md hover:bg-on-primary-fixed/90 transition-colors shadow-sm ${disabledClass}`}
          >
            <ActionIcon forStatus="pago_confirmado" icon={<CheckCircle size={16} weight="fill" />} />
            Confirmar Inscrição
          </button>
        ) : (
          <button
            onClick={() => handleClick('a_pagar')}
            disabled={isDisabled}
            title={disabledReason}
            className={`w-auto flex items-center justify-center gap-2 bg-on-primary-fixed text-white py-3.5 px-5 rounded-xl text-label-md hover:bg-on-primary-fixed/90 transition-colors shadow-sm ${disabledClass}`}
          >
            <ActionIcon forStatus="a_pagar" icon={<CheckCircle size={16} weight="fill" />} />
            Confirmar Dados
          </button>
        )
      )}

      {(status === 'a_pagar' || status === 'lembrete') && (
        <>
          <button
            onClick={() => handleClick('lembrete')}
            disabled={isDisabled}
            title={disabledReason}
            className={`w-auto flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-3.5 px-5 rounded-xl text-label-md hover:bg-gray-50 transition-colors ${disabledClass}`}
          >
            <ActionIcon forStatus="lembrete" icon={<Envelope size={16} weight="fill" />} />
            Enviar Lembrete
          </button>
          <button
            onClick={() => handleClick('pago_confirmado')}
            disabled={isDisabled}
            title={disabledReason}
            className={`w-auto flex items-center justify-center gap-2 bg-on-primary-fixed text-white py-3.5 px-5 rounded-xl text-label-md hover:bg-on-primary-fixed/90 transition-colors shadow-sm ${disabledClass}`}
          >
            <ActionIcon forStatus="pago_confirmado" icon={<CheckCircle size={16} weight="fill" />} />
            Confirmar Pagamento
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run `npx tsc --noEmit`**

Expected: errors at `RegistrationDetail`'s `<StatusActions ...>` call site are expected right now (it doesn't pass `disabledReason` yet — that prop is optional, so actually no error; confirm no errors at all).

- [ ] **Step 4: Commit**

```bash
git add src/components/inscricoes/StatusActions.tsx src/components/inscricoes/SessaoCheiaButton.tsx
git commit -m "feat: add disabledReason to StatusActions and SessaoCheiaButton"
```

---

## Task 8: `RegistrationDetail` — wire the gate end-to-end

**Files:**
- Modify: `src/components/inscricoes/RegistrationDetail.tsx`

**Interfaces:**
- Consumes: `getMissingFields`, `formatMissingFields` (Task 1); `UpdateStatusResult` (Task 5); `required` prop (Task 6); `disabledReason` prop (Task 7).

This task touches one file in several places. Apply each change below; line numbers refer to the file as read before this plan (they will drift slightly as earlier edits land — match by the surrounding code shown, not by number).

- [ ] **Step 1: Imports and helpers**

At the top of `src/components/inscricoes/RegistrationDetail.tsx`, change:

```ts
import { PencilSimple, Check, X, Trash, XCircle } from '@phosphor-icons/react';
```
to:
```ts
import { PencilSimple, Check, X, Trash, XCircle, Warning } from '@phosphor-icons/react';
```

Add, alongside the existing `updateRegistrationStatus` import:
```ts
import { getMissingFields, formatMissingFields } from '@/lib/registration-validation';
```

After the `STATUS_TOAST_MESSAGES` constant, add:

```ts
function getNextStatus(reg: RegistrationWithDetails): RegistrationStatus | null {
  if (reg.status === 'pendente') {
    return reg.voucher_code && reg.children.length === 1 ? 'pago_confirmado' : 'a_pagar';
  }
  if (reg.status === 'a_pagar' || reg.status === 'lembrete') return 'pago_confirmado';
  return null;
}

function buildBlockedToast(missing: { label: string }[]): string {
  return `Não foi possível alterar o estado. Falta: ${formatMissingFields(missing)}.`;
}
```

- [ ] **Step 2: Compute `missing` and `disabledReason` in the component**

Right after `const { family, children } = reg;` add:

```ts
  const nextStatus = getNextStatus(reg);
  const missing = nextStatus ? getMissingFields(reg, { target: nextStatus, silent: false }) : [];
  const disabledReason = missing.length > 0 ? 'Preencha os campos em falta para continuar' : undefined;
```

- [ ] **Step 3: Update `applyStatus` to surface the server's missing-field message**

Replace:
```ts
  async function applyStatus(newStatus: RegistrationStatus, options?: { silent?: boolean }) {
    const result = await updateRegistrationStatus(reg.id, newStatus, options);
    if (!result.success) {
      showToast('Erro ao atualizar estado', 'error');
      return;
    }
    onStatusChange(reg.id, newStatus);
    // Manual overrides don't send the customer email, so their toast shouldn't
    // imply one went out — just confirm the status itself changed.
    const message = options?.silent
      ? `Estado alterado para ${STATUS_LABELS[newStatus]}`
      : STATUS_TOAST_MESSAGES[newStatus];
    if (message) showToast(message);
  }
```
with:
```ts
  async function applyStatus(newStatus: RegistrationStatus, options?: { silent?: boolean }) {
    const result = await updateRegistrationStatus(reg.id, newStatus, options);
    if (!result.success) {
      // A stale client (data changed elsewhere since this panel loaded) can
      // still hit the server's 422 even after the client-side gate passed —
      // this is the one place that surfaces it, never the generic message.
      if (result.missing && result.missing.length > 0) {
        showToast(buildBlockedToast(result.missing), 'error');
      } else {
        showToast('Erro ao atualizar estado', 'error');
      }
      return;
    }
    onStatusChange(reg.id, newStatus);
    // Manual overrides don't send the customer email, so their toast shouldn't
    // imply one went out — just confirm the status itself changed.
    const message = options?.silent
      ? `Estado alterado para ${STATUS_LABELS[newStatus]}`
      : STATUS_TOAST_MESSAGES[newStatus];
    if (message) showToast(message);
  }
```

- [ ] **Step 4: Gate the manual status dropdown (`handleStatusSelect`)**

Replace:
```ts
  function handleStatusSelect(newStatus: RegistrationStatus) {
    setStatusOpen(false);
    if (newStatus === reg.status) return;
    if (reg.status === 'pago_confirmado' && newStatus !== 'pago_confirmado') {
      setPendingStatus(newStatus);
      return;
    }
    applyStatus(newStatus, { silent: true });
  }
```
with:
```ts
  function handleStatusSelect(newStatus: RegistrationStatus) {
    setStatusOpen(false);
    if (newStatus === reg.status) return;
    if (reg.status === 'pago_confirmado' && newStatus !== 'pago_confirmado') {
      setPendingStatus(newStatus);
      return;
    }
    const silentMissing = getMissingFields(reg, { target: newStatus, silent: true });
    if (silentMissing.length > 0) {
      showToast(buildBlockedToast(silentMissing), 'error');
      return;
    }
    applyStatus(newStatus, { silent: true });
  }
```

- [ ] **Step 5: Gate `handleResend`**

Replace:
```ts
  async function handleResend() {
    const result = await updateRegistrationStatus(reg.id, reg.status);
    if (result.success) {
      onUpdate(reg.id, { webhook_error: false, webhook_error_message: null });
    }
  }
```
with:
```ts
  async function handleResend() {
    const resendMissing = getMissingFields(reg, { target: reg.status, silent: false });
    if (resendMissing.length > 0) {
      showToast(buildBlockedToast(resendMissing), 'error');
      return;
    }
    const result = await updateRegistrationStatus(reg.id, reg.status);
    if (result.success) {
      onUpdate(reg.id, { webhook_error: false, webhook_error_message: null });
    } else if (result.missing && result.missing.length > 0) {
      showToast(buildBlockedToast(result.missing), 'error');
    }
  }
```

(`reg.status` is guaranteed non-`'pendente'` here — the resend button only renders inside the `webhook_error` banner, and the webhook only ever fires, and can only fail, on a non-pendente, non-silent transition — so this naturally runs the full check.)

- [ ] **Step 6: Mark the three required `InlineEditField`s**

In the children map, change:
```tsx
                        <InlineEditField
                          value={child.name}
                          fieldName="name"
                          valueClassName="text-body-lg font-medium text-gray-900"
                          onSave={(fieldName, value) => handleChildSave(child.id, fieldName, value)}
                        />
```
to:
```tsx
                        <InlineEditField
                          value={child.name}
                          fieldName="name"
                          required
                          valueClassName="text-body-lg font-medium text-gray-900"
                          onSave={(fieldName, value) => handleChildSave(child.id, fieldName, value)}
                        />
```

Change:
```tsx
                  <InlineEditField
                    label="Responsável"
                    value={family.parent_name}
                    fieldName="parent_name"
                    onSave={handleFamilySave}
                  />
```
to:
```tsx
                  <InlineEditField
                    label="Responsável"
                    value={family.parent_name}
                    fieldName="parent_name"
                    required
                    onSave={handleFamilySave}
                  />
```

Change:
```tsx
                  <InlineEditField
                    label="Escolha"
                    value={reg.plan}
                    fieldName="plan"
                    onSave={handlePlanSave}
                  />
```
to:
```tsx
                  <InlineEditField
                    label="Escolha"
                    value={reg.plan}
                    fieldName="plan"
                    required
                    onSave={handlePlanSave}
                  />
```

(`required` here is a static always-required marker per Part 4 of the spec, independent of the transition-specific `missing` list computed in Step 2 — the amber "Em falta" placeholder and the "Campo obrigatório" save guard apply whenever the field is blank, regardless of which status transition is pending.)

- [ ] **Step 7: Guard the selected-dates editor against an empty save**

Add state near the other `useState` calls:
```ts
  const [datesError, setDatesError] = useState<string | null>(null);
```

Change the "start editing" trigger:
```tsx
                    <button
                      onClick={() => { setDatesDraft(reg.selected_dates.join(', ')); setEditingDates(true); }}
```
to:
```tsx
                    <button
                      onClick={() => { setDatesDraft(reg.selected_dates.join(', ')); setDatesError(null); setEditingDates(true); }}
```

Change the save/cancel buttons block:
```tsx
                  {editingDates ? (
                    <div className="flex items-start gap-2">
                      <input
                        type="text"
                        className="flex-1 text-body-md border border-surface-container-highest rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={datesDraft}
                        onChange={(e) => setDatesDraft(e.target.value)}
                        autoFocus
                      />
                      <button
                        onClick={async () => { await handleDatesSave('selected_dates', datesDraft); setEditingDates(false); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors shrink-0 mt-0.5"
                      >
                        <Check size={14} weight="bold" />
                      </button>
                      <button
                        onClick={() => setEditingDates(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-container-highest hover:bg-surface-container text-gray-500 transition-colors shrink-0 mt-0.5"
                      >
                        <X size={14} weight="bold" />
                      </button>
                    </div>
                  ) : (
```
to:
```tsx
                  {editingDates ? (
                    <div>
                      <div className="flex items-start gap-2">
                        <input
                          type="text"
                          className="flex-1 text-body-md border border-surface-container-highest rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                          value={datesDraft}
                          onChange={(e) => setDatesDraft(e.target.value)}
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            const dates = datesDraft.split(',').map((s) => s.trim()).filter(Boolean);
                            if (dates.length === 0) {
                              setDatesError('Campo obrigatório');
                              return;
                            }
                            setDatesError(null);
                            await handleDatesSave('selected_dates', datesDraft);
                            setEditingDates(false);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors shrink-0 mt-0.5"
                        >
                          <Check size={14} weight="bold" />
                        </button>
                        <button
                          onClick={() => setEditingDates(false)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-container-highest hover:bg-surface-container text-gray-500 transition-colors shrink-0 mt-0.5"
                        >
                          <X size={14} weight="bold" />
                        </button>
                      </div>
                      {datesError && <p className="text-label-sm text-error mt-1">{datesError}</p>}
                    </div>
                  ) : (
```

Note `handleDatesSave` re-parses `datesDraft` the same way internally — this duplicates the empty check ahead of it rather than changing `handleDatesSave`'s signature, so the existing call from elsewhere (there is none other than this button) is unaffected.

- [ ] **Step 8: Render the amber notice and pass `disabledReason`**

Change the footer wrapper from:
```tsx
            {/* Footer row */}
            <div className="mt-8 pt-6 border-t border-surface-container-highest flex items-center justify-between gap-4">
```
to:
```tsx
            {missing.length > 0 && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-400 rounded-xl p-4 mt-8">
                <Warning size={18} weight="fill" className="text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-body-md font-medium text-amber-800">Faltam dados para avançar</p>
                  <p className="text-body-md text-amber-700">
                    Preencha os campos em falta antes de alterar o estado: {formatMissingFields(missing)}.
                  </p>
                </div>
              </div>
            )}

            {/* Footer row */}
            <div className={`${missing.length > 0 ? 'mt-6' : 'mt-8'} pt-6 border-t border-surface-container-highest flex items-center justify-between gap-4`}>
```

Then pass the prop to `StatusActions`:
```tsx
                <StatusActions
                  status={reg.status}
                  onAction={handleStatusChange}
                  hasVoucher={!!reg.voucher_code}
                  childrenCount={children.length}
                  selectedDates={reg.selected_dates}
                  month={reg.month}
                  sessaoCheiaNotifiedAt={reg.sessao_cheia_notified_at}
                  onSessaoCheia={handleSessaoCheia}
                  disabledReason={disabledReason}
                />
```

- [ ] **Step 9: Run `npx tsc --noEmit` and `npx eslint src/components/inscricoes/RegistrationDetail.tsx`**

Expected: no errors. Fix any that appear (likely unused-variable from the `parentNameMissing`/`planMissing` cleanup in Step 8 if it was missed).

- [ ] **Step 10: Commit**

```bash
git add src/components/inscricoes/RegistrationDetail.tsx
git commit -m "feat: gate status changes and resend on missing required data"
```

---

## Task 9: Docs — Sobre guide tip and CLAUDE.md

**Files:**
- Modify: `src/app/(dashboard)/sobre/page.tsx`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add the Sobre tip**

In `src/app/(dashboard)/sobre/page.tsx`, inside the `inscricoes` section, after the existing:
```tsx
          <Warning>
            A alteração manual do estado também dispara o envio de email. Usar com cuidado.
          </Warning>
```
add:
```tsx
          <Tip>
            Se faltarem dados obrigatórios (por exemplo, nome do responsável, plano ou datas selecionadas), o painel da inscrição mostra um aviso a laranja e os botões de ação ficam bloqueados até esses campos serem preenchidos.
          </Tip>
```

- [ ] **Step 2: Add the CLAUDE.md line**

In `CLAUDE.md`, under `## Key conventions`, after the existing line about `src/lib/plan-parser.ts`, add:
```
- Status changes are gated by src/lib/registration-validation.ts — update it whenever the Make/Brevo payload gains a required field.
```

- [ ] **Step 3: Run `npx tsc --noEmit` and `npx eslint "src/app/(dashboard)/sobre/page.tsx"`**

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/sobre/page.tsx" CLAUDE.md
git commit -m "docs: note the status-change data-completeness gate"
```

---

## Task 10: Full verification and final summary

**Files:** none (verification only).

- [ ] **Step 1: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors. Fix anything reported before continuing.

- [ ] **Step 2: Run the full Jest suite**

Run: `npx jest`
Expected: all suites pass. Note the total test count — compare against the baseline captured before Task 1 (run `npx jest` once at the very start of execution and record the number, since the spec's final summary requires "test counts before/after").

- [ ] **Step 3: Lint every changed or new file**

Run:
```bash
npx eslint src/lib/registration-validation.ts src/lib/__tests__/registration-validation.test.ts \
  src/app/api/registrations/[id]/status/route.ts src/app/api/registrations/__tests__/status.test.ts \
  src/app/api/registrations/[id]/notify-sessao-cheia/route.ts \
  src/lib/data/registrations.ts \
  src/components/inscricoes/InlineEditField.tsx src/components/inscricoes/StatusActions.tsx src/components/inscricoes/SessaoCheiaButton.tsx src/components/inscricoes/RegistrationDetail.tsx \
  "src/app/(dashboard)/sobre/page.tsx" CLAUDE.md
```
Expected: no errors (CLAUDE.md will simply be skipped/ignored by eslint — harmless). Fix anything reported.

- [ ] **Step 4: Write the final summary for the user**

Report back, per the original spec's "FINAL SUMMARY" requirement:
- Exact files changed (the list from Tasks 1–9).
- The other code path that fires a Make webhook from a school-adjacent action: `src/app/api/unmatched-submissions/[id]/notify/route.ts` (the `email_nao_encontrado` notify route) — intentionally left ungated per the spec's OUT OF SCOPE note.
- The zero-price-plan finding from Task 1: no legitimate plan ever produces `unit_price <= 0` or `num_sessions <= 0` in `parsePlan`, so no exemption was needed.
- Test counts before (baseline from Step 2's first run) vs. after (Step 2's final run).

No commit for this task — it's a report, not a code change.
