# Enriched Attendance Cards + Photo Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show image consent, per-session value, and pack-vs-avulso on each Presenças attendance card, plus a "Só fotos" toggle that filters each slot's grid down to children with photo registos.

**Architecture:** Extend the existing `fetchAttendanceByDate` data layer (mirroring the consent/value math already in `src/lib/data/sessions.ts`) to enrich `AttendanceChild`. Extract the existing `SessionTable` value formatter into the shared `plan-display.ts` module so both surfaces use one implementation. Render the new fields on `AttendanceCard` inside the same dimmed wrapper the header already uses. Add client-side toggle state to the Presenças page that filters each slot's already-fetched children before handing them to `SlotGrid` — no new fetch, no change to sorting/FLIP/marking logic.

**Tech Stack:** Next.js 15 App Router client components, Supabase JS client (`supabaseClient`), Jest + ts-jest, Tailwind CSS 4, Phosphor icons.

## Global Constraints

- All UI-facing text stays in Portuguese ("Só fotos", "Pack mensal", "Avulso", "Nenhuma criança com registos fotográficos").
- Do not change: marking logic (`markAttendance`, `handleMark`), the FLIP animation (`useFlipAnimation`), `sortByMarkedLast`, date-selection logic (`pickDefaultDate`, the date-loading effects), or Sessões page/behavior beyond relocating `formatValue`.
- `AttendanceCard`'s existing layout, border states (`borderClass`), and Presente/Falta buttons must not change structurally — only the header/value area changes.
- Reuse `ConsentIcon` from `src/components/sessoes/ConsentIcon.tsx` — do not duplicate it into `presencas`.
- Finish with `npx tsc --noEmit` and `npx jest` passing (all existing tests + new `formatSessionValue` cases).

---

## File Structure

- **Modify `src/lib/plan-display.ts`** — add exported `formatSessionValue(v: number): string`, identical logic to the local `formatValue` currently in `SessionTable.tsx`.
- **Modify `src/lib/__tests__/plan-display.test.ts`** — add a `describe('formatSessionValue', ...)` block (integer, decimal, zero cases).
- **Modify `src/components/sessoes/SessionTable.tsx`** — delete the local `formatValue`, import `formatSessionValue` from `@/lib/plan-display`, use it in the `Valor` column.
- **Modify `src/lib/data/attendance.ts`** — extend `AttendanceChild` with `imageConsent`, `perSessionValue`, `isPack`; extend the `registration` join and the per-row computation in `fetchAttendanceByDate`.
- **Modify `src/components/presencas/AttendanceCard.tsx`** — add `ConsentIcon` next to the `Camera` icon; add the value/pack row inside the dimmed wrapper.
- **Modify `src/app/(dashboard)/presencas/page.tsx`** — add `photosOnly` state (reset on date change), the "Só fotos" toggle chip next to the date-chips strip, a photo count badge, and per-slot filtering with the muted empty-state line.

---

## Task 1: Shared `formatSessionValue` in plan-display.ts

**Files:**
- Modify: `src/lib/plan-display.ts`
- Modify: `src/lib/__tests__/plan-display.test.ts`
- Modify: `src/components/sessoes/SessionTable.tsx`

**Interfaces:**
- Produces (consumed by Task 3 / `AttendanceCard.tsx`, and by `SessionTable.tsx`): `export function formatSessionValue(v: number): string` — `Number.isInteger(v) ? \`${v}€\` : \`${v.toFixed(2)}€\``.

- [ ] **Step 1: Write the failing tests**

In `src/lib/__tests__/plan-display.test.ts`, change the import line:

```typescript
import { shortenPlan, getInitials, formatSessionValue } from '../plan-display';
```

Then append at the end of the file:

```typescript
describe('formatSessionValue', () => {
  it('formats an integer value without decimals', () => {
    expect(formatSessionValue(12)).toBe('12€');
  });

  it('formats a non-integer value with 2 decimals', () => {
    expect(formatSessionValue(6.5)).toBe('6.50€');
  });

  it('formats zero as 0€', () => {
    expect(formatSessionValue(0)).toBe('0€');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/__tests__/plan-display.test.ts`
Expected: FAIL — `formatSessionValue` is not exported from `../plan-display`.

- [ ] **Step 3: Add the function to plan-display.ts**

Append to `src/lib/plan-display.ts`:

```typescript
export function formatSessionValue(v: number): string {
  return Number.isInteger(v) ? `${v}€` : `${v.toFixed(2)}€`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/__tests__/plan-display.test.ts`
Expected: PASS (all cases, including the 3 new ones).

- [ ] **Step 5: Update SessionTable.tsx to use the shared function**

In `src/components/sessoes/SessionTable.tsx`, remove the local function:

```typescript
function formatValue(v: number): string {
  return Number.isInteger(v) ? `${v}€` : `${v.toFixed(2)}€`;
}
```

Add to the imports at the top:

```typescript
import { formatSessionValue } from '@/lib/plan-display';
```

Change the one usage:

```typescript
<td className="py-4 px-6 font-medium">{formatValue(child.perSessionValue)}</td>
```

to:

```typescript
<td className="py-4 px-6 font-medium">{formatSessionValue(child.perSessionValue)}</td>
```

- [ ] **Step 6: Run `tsc --noEmit`**

Run: `npx tsc --noEmit`
Expected: no errors (confirms no leftover reference to the deleted `formatValue`).

- [ ] **Step 7: Commit**

```bash
git add src/lib/plan-display.ts src/lib/__tests__/plan-display.test.ts src/components/sessoes/SessionTable.tsx
git commit -m "refactor: share session-value formatting via plan-display.ts"
```

---

## Task 2: Enrich AttendanceChild in the data layer

**Files:**
- Modify: `src/lib/data/attendance.ts`

**Interfaces:**
- Consumes: `mapConsent(value: string | null | undefined): ConsentType` from `src/lib/consent-utils.ts` (already used identically in `src/lib/data/sessions.ts:65`).
- Produces (consumed by Task 3 / `AttendanceCard.tsx`): `AttendanceChild` gains `imageConsent: ConsentType`, `perSessionValue: number`, `isPack: boolean`.

- [ ] **Step 1: Add the import and extend the interface**

At the top of `src/lib/data/attendance.ts`, add:

```typescript
import { mapConsent, type ConsentType } from '@/lib/consent-utils';
```

Change:

```typescript
export interface AttendanceChild {
  sessionChildId: string;
  childName: string;
  dateOfBirth: string | null;
  parentName: string;
  present: boolean | null;
  hasPhotos: boolean;
}
```

to:

```typescript
export interface AttendanceChild {
  sessionChildId: string;
  childName: string;
  dateOfBirth: string | null;
  parentName: string;
  present: boolean | null;
  hasPhotos: boolean;
  imageConsent: ConsentType;
  perSessionValue: number;
  isPack: boolean;
}
```

- [ ] **Step 2: Extend the registration join and Row type**

Change the `session_children` select:

```typescript
  const { data: childrenData, error: childrenError } = await supabaseClient
    .from('session_children')
    .select(
      'id, session_id, present, child:children(name, date_of_birth), registration:registrations(has_photos, family:families(parent_name))',
    )
    .in('session_id', sessionIds);
```

to:

```typescript
  const { data: childrenData, error: childrenError } = await supabaseClient
    .from('session_children')
    .select(
      'id, session_id, present, child:children(name, date_of_birth), registration:registrations(has_photos, plan, total_price, num_sessions, image_consent, family:families(parent_name))',
    )
    .in('session_id', sessionIds);
```

Change the `Row` interface:

```typescript
  interface Row {
    id: string;
    session_id: string;
    present: boolean | null;
    child: { name: string; date_of_birth: string | null } | null;
    registration: { has_photos: boolean; family: { parent_name: string } | null } | null;
  }
```

to:

```typescript
  interface Row {
    id: string;
    session_id: string;
    present: boolean | null;
    child: { name: string; date_of_birth: string | null } | null;
    registration: {
      has_photos: boolean;
      plan: string;
      total_price: number;
      num_sessions: number;
      image_consent: string | null;
      family: { parent_name: string } | null;
    } | null;
  }
```

- [ ] **Step 3: Compute the new fields per row**

Change the row-building loop:

```typescript
  for (const row of rows) {
    if (!row.child) continue;

    const child: AttendanceChild = {
      sessionChildId: row.id,
      childName: row.child.name,
      dateOfBirth: row.child.date_of_birth,
      parentName: row.registration?.family?.parent_name ?? '',
      present: row.present,
      hasPhotos: row.registration?.has_photos ?? false,
    };
```

to:

```typescript
  for (const row of rows) {
    if (!row.child) continue;

    const numSessions = row.registration?.num_sessions ?? 0;
    const perSessionValue =
      numSessions > 0 && row.registration ? row.registration.total_price / numSessions : 0;

    const child: AttendanceChild = {
      sessionChildId: row.id,
      childName: row.child.name,
      dateOfBirth: row.child.date_of_birth,
      parentName: row.registration?.family?.parent_name ?? '',
      present: row.present,
      hasPhotos: row.registration?.has_photos ?? false,
      imageConsent: mapConsent(row.registration?.image_consent),
      perSessionValue,
      isPack: numSessions > 1,
    };
```

- [ ] **Step 4: Run `tsc --noEmit`**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run the full test suite**

Run: `npx jest`
Expected: all existing suites still pass (no test currently covers `fetchAttendanceByDate` directly, so this is a regression check on everything else).

- [ ] **Step 6: Commit**

```bash
git add src/lib/data/attendance.ts
git commit -m "feat: compute image consent, per-session value, and pack flag for attendance"
```

---

## Task 3: Render consent, value, and pack pill on AttendanceCard

**Files:**
- Modify: `src/components/presencas/AttendanceCard.tsx`

**Interfaces:**
- Consumes: `ConsentIcon` from `src/components/sessoes/ConsentIcon.tsx` (signature: `({ consent: ConsentType }) => JSX.Element`); `formatSessionValue` from `src/lib/plan-display.ts` (Task 1); `AttendanceChild.imageConsent` / `.perSessionValue` / `.isPack` (Task 2).

- [ ] **Step 1: Add imports**

In `src/components/presencas/AttendanceCard.tsx`, change:

```typescript
import { Camera, Check, X } from '@phosphor-icons/react';
import { calculateAge } from '@/lib/age-calculator';
import { shortenName } from '@/lib/name-utils';
import type { AttendanceChild } from '@/lib/data/attendance';
```

to:

```typescript
import { Camera, Check, X } from '@phosphor-icons/react';
import { calculateAge } from '@/lib/age-calculator';
import { shortenName } from '@/lib/name-utils';
import { formatSessionValue } from '@/lib/plan-display';
import { ConsentIcon } from '@/components/sessoes/ConsentIcon';
import type { AttendanceChild } from '@/lib/data/attendance';
```

- [ ] **Step 2: Restructure the header into a shared dimmed wrapper with the new value/pack row**

Replace:

```typescript
      <div className={`flex justify-between items-start gap-3 ${present === false ? 'opacity-60' : ''}`}>
        <div className="min-w-0">
          <p className="text-body-lg font-medium text-gray-900">{shortenName(child.childName)}</p>
          <p className="text-[13px] text-gray-500">{shortenName(child.parentName)}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {child.dateOfBirth && (
            <p className="text-[13px] text-gray-500 whitespace-nowrap">{calculateAge(child.dateOfBirth)}</p>
          )}
          {child.hasPhotos && <Camera size={18} className="text-sky-500" />}
        </div>
      </div>
```

with:

```typescript
      <div className={present === false ? 'opacity-60' : ''}>
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <p className="text-body-lg font-medium text-gray-900">{shortenName(child.childName)}</p>
            <p className="text-[13px] text-gray-500">{shortenName(child.parentName)}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {child.dateOfBirth && (
              <p className="text-[13px] text-gray-500 whitespace-nowrap">{calculateAge(child.dateOfBirth)}</p>
            )}
            <div className="flex items-center gap-1.5">
              <ConsentIcon consent={child.imageConsent} />
              {child.hasPhotos && <Camera size={18} className="text-sky-500" />}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-surface-container-highest mt-2.5 pt-2.5">
          <span className="text-[13px] text-gray-500">{formatSessionValue(child.perSessionValue)} / sessão</span>
          <span
            className={`text-[12px] px-2.5 py-0.5 rounded-full whitespace-nowrap ${
              child.isPack ? 'bg-[#EBF0ED] text-[#085041]' : 'bg-surface-container text-gray-500'
            }`}
          >
            {child.isPack ? 'Pack mensal' : 'Avulso'}
          </span>
        </div>
      </div>
```

Note: the `mt-auto pt-3` buttons block right after this stays exactly as-is — it is a sibling of this wrapper, not inside it, so buttons never dim.

- [ ] **Step 3: Run `tsc --noEmit`**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the full test suite**

Run: `npx jest`
Expected: all suites pass (no test targets this component directly; this is a regression check).

- [ ] **Step 5: Commit**

```bash
git add src/components/presencas/AttendanceCard.tsx
git commit -m "feat: show consent icon, per-session value, and pack pill on attendance cards"
```

---

## Task 4: "Só fotos" filter on the Presenças page

**Files:**
- Modify: `src/app/(dashboard)/presencas/page.tsx`

**Interfaces:**
- Consumes: `AttendanceChild.hasPhotos` (already existed; unchanged by Task 2); `SlotGrid({ sessionChildren: AttendanceChild[], onMark })` (unchanged signature, called with a filtered array).

- [ ] **Step 1: Add the Camera icon import and photosOnly state**

Change:

```typescript
import { SLOT_PILL, SLOT_LABEL } from '@/lib/slot-utils';
import { getTodayLisbon } from '@/lib/date-utils';
```

to:

```typescript
import { Camera } from '@phosphor-icons/react';
import { SLOT_PILL, SLOT_LABEL } from '@/lib/slot-utils';
import { getTodayLisbon } from '@/lib/date-utils';
```

In the `PresencasPage` component, after:

```typescript
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const chipsRef = useRef<HTMLDivElement>(null);
```

add:

```typescript
  const [photosOnly, setPhotosOnly] = useState(false);
```

- [ ] **Step 2: Reset the filter when the date changes**

After the existing effect that scrolls the selected chip into view:

```typescript
  useEffect(() => {
    if (!selectedDate || !chipsRef.current) return;
    chipsRef.current
      .querySelector<HTMLElement>(`[data-date="${CSS.escape(selectedDate)}"]`)
      ?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [selectedDate, sessionDates]);
```

add a new effect:

```typescript
  useEffect(() => {
    setPhotosOnly(false);
  }, [selectedDate]);
```

- [ ] **Step 3: Compute the total photo count for the badge**

After the `handleMark` function and before `if (!month || year === null) return null;`, add:

```typescript
  const totalPhotoCount = useMemo(
    () => sessions.reduce((sum, s) => sum + s.children.filter((c) => c.hasPhotos).length, 0),
    [sessions],
  );
```

(`useMemo` is already imported at the top of this file.)

- [ ] **Step 4: Wrap the date-chips strip with the toggle chip**

Replace:

```typescript
          <div
            ref={chipsRef}
            className="flex gap-2 overflow-x-auto mb-8 pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none"
          >
            {sessionDates.map((d) => (
              <button
                key={d.date}
                data-date={d.date}
                onClick={() => setSelectedDate(d.date)}
                className={`shrink-0 min-h-11 px-4 py-2.5 rounded-xl text-label-md whitespace-nowrap transition-colors touch-manipulation select-none ${
                  selectedDate === d.date
                    ? 'bg-on-primary-fixed text-white'
                    : 'bg-surface-container-lowest border border-surface-container-highest text-gray-600 hover:bg-surface-container-low active:bg-surface-container'
                }`}
              >
                {d.date} {d.dayOfWeek}
              </button>
            ))}
          </div>
```

with:

```typescript
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <div
              ref={chipsRef}
              className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none flex-1 min-w-0"
            >
              {sessionDates.map((d) => (
                <button
                  key={d.date}
                  data-date={d.date}
                  onClick={() => setSelectedDate(d.date)}
                  className={`shrink-0 min-h-11 px-4 py-2.5 rounded-xl text-label-md whitespace-nowrap transition-colors touch-manipulation select-none ${
                    selectedDate === d.date
                      ? 'bg-on-primary-fixed text-white'
                      : 'bg-surface-container-lowest border border-surface-container-highest text-gray-600 hover:bg-surface-container-low active:bg-surface-container'
                  }`}
                >
                  {d.date} {d.dayOfWeek}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPhotosOnly((v) => !v)}
              className={`shrink-0 min-h-11 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-label-md whitespace-nowrap transition-colors touch-manipulation select-none ${
                photosOnly
                  ? 'bg-on-primary-fixed text-white'
                  : 'bg-surface-container-lowest border border-surface-container-highest text-gray-600 hover:bg-surface-container-low active:bg-surface-container'
              }`}
            >
              <Camera size={16} />
              Só fotos
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                  photosOnly ? 'bg-white/20 text-white' : 'bg-surface-container text-gray-500'
                }`}
              >
                {totalPhotoCount}
              </span>
            </button>
          </div>
```

`chipsRef` still points at the inner scrolling div, so the existing scroll-into-view effect (Step 2's neighbor, untouched) keeps working unchanged. `flex-wrap` on the outer row lets the toggle drop to its own line on narrow viewports without affecting the inner div's own `overflow-x-auto` scroll.

- [ ] **Step 5: Filter each slot's children before passing to SlotGrid**

Replace:

```typescript
            <div className="flex flex-col gap-10">
              {sessions.map((session) => {
                const presentCount = session.children.filter((c) => c.present === true).length;
                return (
                  <div key={session.sessionId}>
                    <div className="flex items-center gap-4 mb-4">
                      <span className={`px-3 py-1 rounded-full text-label-md ${SLOT_PILL[session.slot]}`}>
                        {SLOT_LABEL[session.slot]}
                      </span>
                      <span className="text-body-md text-gray-500">
                        {presentCount}/{session.children.length} presentes
                      </span>
                    </div>
                    <SlotGrid sessionChildren={session.children} onMark={handleMark} />
                  </div>
                );
              })}
            </div>
```

with:

```typescript
            <div className="flex flex-col gap-10">
              {sessions.map((session) => {
                const presentCount = session.children.filter((c) => c.present === true).length;
                const visibleChildren = photosOnly
                  ? session.children.filter((c) => c.hasPhotos)
                  : session.children;
                return (
                  <div key={session.sessionId}>
                    <div className="flex items-center gap-4 mb-4">
                      <span className={`px-3 py-1 rounded-full text-label-md ${SLOT_PILL[session.slot]}`}>
                        {SLOT_LABEL[session.slot]}
                      </span>
                      <span className="text-body-md text-gray-500">
                        {presentCount}/{session.children.length} presentes
                      </span>
                    </div>
                    {photosOnly && visibleChildren.length === 0 ? (
                      <p className="text-body-md text-gray-400">Nenhuma criança com registos fotográficos</p>
                    ) : (
                      <SlotGrid sessionChildren={visibleChildren} onMark={handleMark} />
                    )}
                  </div>
                );
              })}
            </div>
```

Note `presentCount` and the `X/Y presentes` label keep reading from the full, unfiltered `session.children` — only the grid passed to `SlotGrid` is filtered. Sorting (`sortByMarkedLast`) and the FLIP animation live inside `SlotGrid` and run unmodified on whatever array they're given.

- [ ] **Step 6: Run `tsc --noEmit`**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Run the full test suite**

Run: `npx jest`
Expected: all suites pass (no automated test targets this page; this is a regression check).

- [ ] **Step 8: Commit**

```bash
git add "src/app/(dashboard)/presencas/page.tsx"
git commit -m "feat: add photo-only filter toggle to Presenças date row"
```

---

## Task 5: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx jest`
Expected: all suites pass, including the 3 new `formatSessionValue` cases in `plan-display.test.ts`.

- [ ] **Step 2: Run the full typecheck**

Run: `npx tsc --noEmit`
Expected: no errors anywhere in the project.

- [ ] **Step 3: Review the diff end-to-end**

Run: `git diff main --stat` (or `git log --stat` over the commits from this plan)
Confirm: only the six files listed under File Structure changed, and no marking/FLIP/sorting/date-selection logic was touched.

---

## Self-Review Notes

- **Spec coverage:** data-layer fields + math (Task 2), shared formatter + SessionTable relocation + tests (Task 1), card layout with consent icon ordering and dimmed wrapper (Task 3), toggle chip + count badge + per-slot filter + muted empty line (Task 4) — all covered. Verification in Task 5.
- **Placeholder scan:** none — all steps show full before/after code blocks.
- **Type consistency:** `AttendanceChild.imageConsent: ConsentType` (Task 2) matches `ConsentIcon`'s `consent: ConsentType` prop (Task 3) and the `ConsentType` already re-exported from `src/types/sessions.ts` / defined in `src/lib/consent-utils.ts`. `formatSessionValue(v: number): string` signature is identical between its Task 1 definition and its Task 3 call site. `SlotGrid`'s `sessionChildren: AttendanceChild[]` prop type is unchanged — Task 4 only changes what array is passed in, not the component's interface.
