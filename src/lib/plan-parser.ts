export function parsePlan(plan: string): {
  unitPrice: number;
  numSessions: number;
  hasPhotos: boolean;
} {
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
