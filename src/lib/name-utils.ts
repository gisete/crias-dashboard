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
