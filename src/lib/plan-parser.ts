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
