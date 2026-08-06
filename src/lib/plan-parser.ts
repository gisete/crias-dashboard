export function parsePlan(plan: string): {
  unitPrice: number;
  numSessions: number;
  hasPhotos: boolean;
} {
  // Split only at a " + " that follows a completed "(N€)" — this is a
  // combined plan (individual + pack) boundary, not the "+ N registos
  // fotográficos" addon inside a single plan, which has no price before it.
  const parts = plan.split(/(?<=\(\d+€\))\s*\+\s*/);
  if (parts.length > 1) {
    const parsed = parts.map((part) => parsePlan(part.trim()));
    return {
      unitPrice: parsed.reduce((sum, p) => sum + p.unitPrice, 0),
      numSessions: parsed.reduce((sum, p) => sum + p.numSessions, 0),
      hasPhotos: parsed.some((p) => p.hasPhotos),
    };
  }

  const priceMatch = plan.match(/(\d+)€\)\s*$/);
  const unitPrice = priceMatch ? parseInt(priceMatch[1], 10) : 0;

  const hasPhotos = plan.toLowerCase().includes('registos fotográficos');

  let numSessions = 1;
  const mensalMatch = plan.match(/mensal\s+(\d+)/i);
  if (mensalMatch) {
    numSessions = parseInt(mensalMatch[1], 10);
  } else {
    const sessaoMatch = plan.match(/(\d+)\s+sess[ãõ]/i);
    if (sessaoMatch) {
      numSessions = parseInt(sessaoMatch[1], 10);
    }
  }

  return { unitPrice, numSessions, hasPhotos };
}

export interface PlanPart {
  unitPrice: number;
  numSessions: number;
  hasPhotos: boolean;
  isPack: boolean;
}

export function parsePlanParts(plan: string): PlanPart[] {
  // Reuse the same split regex from parsePlan to separate combined plans
  const parts = plan.split(/(?<=\(\d+€\))\s*\+\s*/);
  return parts.map((part) => {
    const parsed = parsePlan(part.trim());
    return {
      ...parsed,
      isPack: part.toLowerCase().includes('mensal'),
    };
  });
}

/**
 * Compute a per-session value for each date slot, allocating dates to plan
 * parts in order. For single plans every date gets the same value. For
 * combined plans (e.g. "1 sessão (14€) + Pack mensal 4 sessões (50€)"),
 * the first date gets 14€ and the next four get 12.50€.
 */
export function computePerSessionValues(plan: string, numDates: number): number[] {
  const parts = parsePlanParts(plan);
  const values: number[] = [];

  for (const part of parts) {
    const perSession = part.numSessions > 0 ? part.unitPrice / part.numSessions : 0;
    const count = Math.min(part.numSessions, numDates - values.length);
    for (let i = 0; i < count; i++) {
      values.push(perSession);
    }
  }

  // If more dates than plan sessions (edge case), fill with last part's rate
  if (values.length < numDates && parts.length > 0) {
    const last = parts[parts.length - 1];
    const fallback = last.numSessions > 0 ? last.unitPrice / last.numSessions : 0;
    while (values.length < numDates) {
      values.push(fallback);
    }
  }

  return values;
}
