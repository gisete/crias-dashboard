# Outbound Make Webhook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fire an outbound webhook to Make (driving Brevo email automations) whenever a registration's status changes to anything other than `pendente`, with a testable payload builder, DB-backed error surfacing, and a retry path through the existing banner.

**Architecture:** A new pure function `buildStatusWebhookPayload` builds the flat JSON payload from already-fetched rows; `sendStatusWebhook` wraps it with the Supabase fetch + `fetch()` POST and throws descriptive errors on failure. The status PATCH route calls `sendStatusWebhook` after its existing session-sync block, catching failures into `webhook_error`/`webhook_error_message` columns (which already exist on `registrations`) without breaking the status update's success response. The existing `WebhookErrorBanner` retry button re-PATCHes the current status, which re-triggers the webhook and, through the same route logic, clears the error columns on success.

**Tech Stack:** Next.js 15 route handlers, `@supabase/supabase-js` (no ORM), `fetch` with `AbortSignal.timeout`, Jest + ts-jest.

## Global Constraints

- All UI-facing text stays in Portuguese (error message prefix: `Erro ao enviar notificação: <message>`).
- No ORM — use `@supabase/supabase-js` directly, same client helper (`createServerClient` from `src/lib/supabase/server.ts`) used elsewhere.
- Do not change the existing session-sync logic or its error handling in `src/app/api/registrations/[id]/status/route.ts`.
- Do not change `WebhookErrorBanner.tsx` itself.
- `webhook_error: boolean` and `webhook_error_message: string | null` already exist on `Registration` (`src/types/database.ts:32-33`) and in the DB — no migration needed.
- Finish with `tsc --noEmit` and the full `npx jest` suite passing (including all pre-existing tests).

---

## File Structure

- **Create `src/lib/make-webhook.ts`** — payload types, the pure `buildStatusWebhookPayload` function, and `sendStatusWebhook` (fetch + POST). This is the single source of truth for the outbound payload shape.
- **Create `src/lib/__tests__/make-webhook.test.ts`** — unit tests for `buildStatusWebhookPayload` only (no fetch mocking needed).
- **Modify `src/app/api/registrations/[id]/status/route.ts`** — widen the initial `select` to also fetch `webhook_error`, and add the webhook trigger + error-column bookkeeping after the existing session-sync `try/catch` block.
- **Modify `src/components/inscricoes/RegistrationDetail.tsx`** — change `handleResend` (lines 152-155) to re-PATCH the current status via `updateRegistrationStatus` instead of directly clearing flags with `updateRegistration`.

---

## Task 1: Payload types + pure builder function, with tests

**Files:**
- Create: `src/lib/make-webhook.ts`
- Test: `src/lib/__tests__/make-webhook.test.ts`

**Interfaces:**
- Produces (consumed by Task 2 and the route in Task 3):
  - `export interface WebhookRegistration { id: string; month: string; year: number; plan: string; unit_price: number; total_price: number; num_sessions: number; num_children: number; has_photos: boolean; selected_dates: string[]; nif: string | null; voucher_code: string | null; notes: string | null; }`
  - `export interface WebhookFamily { parent_name: string; email: string; phone: string | null; }`
  - `export interface WebhookChild { name: string; date_of_birth: string | null; }`
  - `export interface StatusWebhookPayload { status: RegistrationStatus; registration_id: string; responsavel_nome: string; responsavel_email: string; responsavel_telefone: string | null; criancas_nomes: string; mes: string; year: number; plano: string; unit_price: number; total_price: number; num_sessions: number; num_children: number; has_photos: boolean; datas_selecionadas: string; nif: string | null; voucher_code: string | null; notas: string | null; }`
  - `export function buildStatusWebhookPayload(registration: WebhookRegistration, family: WebhookFamily, children: WebhookChild[], status: RegistrationStatus): StatusWebhookPayload`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/make-webhook.test.ts`:

```typescript
import { buildStatusWebhookPayload, type WebhookRegistration, type WebhookFamily, type WebhookChild } from '../make-webhook';

const baseRegistration: WebhookRegistration = {
  id: 'reg-1',
  month: 'julho',
  year: 2026,
  plan: '2 sessões + 6 registos fotográficos (40€)',
  unit_price: 40,
  total_price: 80,
  num_sessions: 2,
  num_children: 2,
  has_photos: true,
  selected_dates: ['5 (manhã)', '12 (tarde)'],
  nif: '123456789',
  voucher_code: 'VERAO10',
  notes: 'Alergia a frutos secos',
};

const baseFamily: WebhookFamily = {
  parent_name: 'Maria Silva',
  email: 'maria@example.com',
  phone: '912345678',
};

const twoChildren: WebhookChild[] = [
  { name: 'Ana', date_of_birth: '2018-03-01' },
  { name: 'Bruno', date_of_birth: '2020-07-15' },
];

describe('buildStatusWebhookPayload', () => {
  it('builds a full payload with children joined by commas', () => {
    const result = buildStatusWebhookPayload(baseRegistration, baseFamily, twoChildren, 'pago_confirmado');

    expect(result).toEqual({
      status: 'pago_confirmado',
      registration_id: 'reg-1',
      responsavel_nome: 'Maria Silva',
      responsavel_email: 'maria@example.com',
      responsavel_telefone: '912345678',
      criancas_nomes: 'Ana, Bruno',
      mes: 'julho',
      year: 2026,
      plano: '2 sessões + 6 registos fotográficos (40€)',
      unit_price: 40,
      total_price: 80,
      num_sessions: 2,
      num_children: 2,
      has_photos: true,
      datas_selecionadas: '5 (manhã), 12 (tarde)',
      nif: '123456789',
      voucher_code: 'VERAO10',
      notas: 'Alergia a frutos secos',
    });
  });

  it('represents missing optional fields as null', () => {
    const registration: WebhookRegistration = {
      ...baseRegistration,
      nif: null,
      voucher_code: null,
      notes: null,
    };

    const result = buildStatusWebhookPayload(registration, baseFamily, twoChildren, 'a_pagar');

    expect(result.nif).toBeNull();
    expect(result.voucher_code).toBeNull();
    expect(result.notas).toBeNull();
  });

  it('represents an empty children array as an empty string', () => {
    const result = buildStatusWebhookPayload(baseRegistration, baseFamily, [], 'lembrete');

    expect(result.criancas_nomes).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/__tests__/make-webhook.test.ts`
Expected: FAIL — `Cannot find module '../make-webhook'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/make-webhook.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/__tests__/make-webhook.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/make-webhook.ts src/lib/__tests__/make-webhook.test.ts
git commit -m "feat: add outbound Make webhook payload builder and sender"
```

---

## Task 2: Trigger the webhook from the status route

**Files:**
- Modify: `src/app/api/registrations/[id]/status/route.ts`

**Interfaces:**
- Consumes: `sendStatusWebhook(registrationId: string, newStatus: RegistrationStatus): Promise<void>` from Task 1 (`src/lib/make-webhook.ts`).

- [ ] **Step 1: Widen the initial select to include `webhook_error`**

In `src/app/api/registrations/[id]/status/route.ts`, change:

```typescript
  const { data: current, error: fetchError } = await supabase
    .from('registrations')
    .select('status')
    .eq('id', id)
    .maybeSingle();
```

to:

```typescript
  const { data: current, error: fetchError } = await supabase
    .from('registrations')
    .select('status, webhook_error')
    .eq('id', id)
    .maybeSingle();
```

- [ ] **Step 2: Add the import**

Add to the top imports:

```typescript
import { sendStatusWebhook } from '@/lib/make-webhook';
```

- [ ] **Step 3: Add the webhook trigger after the session-sync block**

The session-sync `try/catch` currently ends with:

```typescript
  } catch (error) {
    // The status update already succeeded — surface the partial state
    // instead of a bare 500 so the caller knows sessions are out of sync.
    console.error(`Session sync failed for registration ${id}:`, error);
    return NextResponse.json(
      { error: 'Estado atualizado, mas a sincronização de sessões falhou.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
```

Leave that `catch` block untouched. Insert a new block between it and the final `return`, so the end of the file reads:

```typescript
  } catch (error) {
    // The status update already succeeded — surface the partial state
    // instead of a bare 500 so the caller knows sessions are out of sync.
    console.error(`Session sync failed for registration ${id}:`, error);
    return NextResponse.json(
      { error: 'Estado atualizado, mas a sincronização de sessões falhou.' },
      { status: 500 },
    );
  }

  if (status !== 'pendente') {
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
```

Note the status change itself already succeeded by this point, so this block always returns `{ success: true }` regardless of webhook outcome — the banner (existing `WebhookErrorBanner` component, driven by `webhook_error`/`webhook_error_message` on the registration row) is how the failure surfaces to the user.

- [ ] **Step 4: Verify with `tsc --noEmit`**

Run: `npx tsc --noEmit`
Expected: no errors related to `route.ts` or `make-webhook.ts`.

- [ ] **Step 5: Manual sanity read**

Re-read the full file to confirm: the session-sync `try/catch` is byte-for-byte unchanged, `current` now carries `webhook_error`, and the new block sits strictly after it and before the final `return`.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/registrations/[id]/status/route.ts
git commit -m "feat: fire Make webhook on registration status change"
```

---

## Task 3: Retry path — handleResend re-fires the webhook

**Files:**
- Modify: `src/components/inscricoes/RegistrationDetail.tsx`

**Interfaces:**
- Consumes: `updateRegistrationStatus(id: string, newStatus: string): Promise<{ success: boolean }>` — already exists in `src/lib/data/registrations.ts:257-267`, already imported in this file (line 11).

- [ ] **Step 1: Replace `handleResend`**

Current code (lines 152-155):

```typescript
  async function handleResend() {
    await updateRegistration(reg.id, { webhook_error: false, webhook_error_message: null });
    onUpdate(reg.id, { webhook_error: false, webhook_error_message: null });
  }
```

Replace with:

```typescript
  async function handleResend() {
    const result = await updateRegistrationStatus(reg.id, reg.status);
    if (result.success) {
      onUpdate(reg.id, { webhook_error: false, webhook_error_message: null });
    }
  }
```

This re-PATCHes with the *current* status (`reg.status`), so the status route's session-sync branch is a no-op (old status === new status) while the new webhook-trigger branch fires again and updates the DB's error columns per Task 2. `WebhookErrorBanner.tsx` itself is untouched — it still just renders `reg.webhook_error`/`reg.webhook_error_message` and calls `onResend`.

- [ ] **Step 2: Run `tsc --noEmit`**

Run: `npx tsc --noEmit`
Expected: no errors. (`updateRegistration` import remains used elsewhere in this file via `handleSave`/`handleFamilySave`/etc., so no unused-import cleanup needed.)

- [ ] **Step 3: Commit**

```bash
git add src/components/inscricoes/RegistrationDetail.tsx
git commit -m "feat: retry banner re-fires Make webhook via status re-PATCH"
```

---

## Task 4: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx jest`
Expected: all suites pass, including the new `make-webhook.test.ts` and every pre-existing test (`age-calculator`, `date-parser`, `date-utils`, `name-utils`, `plan-display`, `plan-parser`).

- [ ] **Step 2: Run the full typecheck**

Run: `npx tsc --noEmit`
Expected: no errors anywhere in the project.

- [ ] **Step 3: Review the diff end-to-end**

Run: `git diff main` (or `git log --stat` over the commits from this plan)
Confirm: only the four files above changed, the session-sync block in the status route is untouched, and `WebhookErrorBanner.tsx` is untouched.

---

## Self-Review Notes

- **Spec coverage:** helper file + `sendStatusWebhook` signature (Task 1), route trigger with exact clear/set-error semantics (Task 2), banner retry re-PATCH (Task 3), payload-builder tests covering full/null/empty-children cases (Task 1) — all covered. `tsc --noEmit` + full suite covered in Task 4.
- **Placeholder scan:** none — all steps show full code.
- **Type consistency:** `WebhookRegistration`/`WebhookFamily`/`WebhookChild`/`StatusWebhookPayload` are defined once in Task 1 and only referenced (not redefined) afterward; `sendStatusWebhook(registrationId: string, newStatus: RegistrationStatus): Promise<void>` matches its Task 2 call site exactly.
