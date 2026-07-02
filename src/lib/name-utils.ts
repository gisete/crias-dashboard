/** Returns just the first name: "Francisco Xavier Bandeira" → "Francisco" */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || '';
}

/** Returns first + last name: "Mariana Silva Bandeira de Vasconcelos" → "Mariana Vasconcelos" */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || '';
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

const PORTUGUESE_PARTICLES = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/**
 * Returns first word + last surname, keeping a Portuguese connecting
 * particle (de, da, do, das, dos, e) when it immediately precedes the
 * last surname: "Afonso Sequeira Vieira da Luz" → "Afonso da Luz"
 */
export function shortenName(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) return words.join(' ');

  const first = words[0];
  const last = words[words.length - 1];
  const beforeLast = words[words.length - 2];

  if (PORTUGUESE_PARTICLES.has(beforeLast.toLowerCase())) {
    return `${first} ${beforeLast} ${last}`;
  }
  return `${first} ${last}`;
}
