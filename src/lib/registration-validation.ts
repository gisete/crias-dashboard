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
  return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email!.trim());
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
