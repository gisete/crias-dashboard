export function shortenPlan(plan: string): string {
  const lower = plan.toLowerCase();
  const hasPhotos = lower.includes('registos fotográficos');
  const isMensal = lower.includes('mensal');

  const sessaoMatch = plan.match(/(\d+)\s+sess[ãõ]/i);
  const mensalMatch = plan.match(/mensal\s+(\d+)/i);
  const numSessions = mensalMatch
    ? parseInt(mensalMatch[1], 10)
    : sessaoMatch
    ? parseInt(sessaoMatch[1], 10)
    : 1;

  if (isMensal) {
    return hasPhotos ? `Pack ${numSessions}s + foto` : `Pack ${numSessions}s`;
  }
  if (numSessions === 1) return '1 sessão';
  return hasPhotos ? `${numSessions}s + foto` : `${numSessions} sessões`;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function formatSessionValue(v: number): string {
  return Number.isInteger(v) ? `${v}€` : `${v.toFixed(2)}€`;
}

export function getPlanOptions(): string[] {
  return [
    '1 sessão (14€)',
    '2 sessões (26€)',
    '2 sessões + 6 registos fotográficos (40€)',
    'Pack mensal 4 sessões (50€)',
    'Pack mensal 4 sessões + 8 registos fotográficos (66€)',
    'Pack mensal 8 sessões (88€)',
    'Pack mensal 8 sessões + 16 registos fotográficos (132€)',
    'Pack mensal 16 sessões (176€)',
    'Pack mensal 16 sessões + 32 registos fotográficos (264€)',
  ];
}
