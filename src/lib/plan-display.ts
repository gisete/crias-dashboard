import { parsePlanParts } from '@/lib/plan-parser';

export function shortenPlan(plan: string): string {
  const parts = parsePlanParts(plan);

  if (parts.length === 1) {
    // Single plan — preserve existing output format exactly
    const p = parts[0];
    if (p.isPack) {
      return p.hasPhotos ? `Pack ${p.numSessions}s + foto` : `Pack ${p.numSessions}s`;
    }
    if (p.numSessions === 1) return '1 sessão';
    return p.hasPhotos ? `${p.numSessions}s + foto` : `${p.numSessions} sessões`;
  }

  // Combined plan — shorter labels joined with " + "
  return parts
    .map((p) => {
      const base = p.isPack ? `Pack ${p.numSessions}s` : `${p.numSessions}s`;
      return p.hasPhotos ? `${base} foto` : base;
    })
    .join(' + ');
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function getFirstLastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return name.trim();
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export function formatSessionValue(v: number): string {
  return Number.isInteger(v) ? `${v}€` : `${v.toFixed(2)}€`;
}

export function formatPlanBreakdown(plan: string): string {
  const parts = parsePlanParts(plan);

  return parts
    .map((p) => {
      const segments = [
        `${p.unitPrice}€`,
        p.numSessions === 1 ? '1 sessão' : `${p.numSessions} sessões`,
      ];
      if (p.numSessions > 1) {
        const perSession = (p.unitPrice / p.numSessions).toLocaleString('pt-PT', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        segments.push(`${perSession}€/sessão`);
      }
      return segments.join(' · ');
    })
    .join(' + ');
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
