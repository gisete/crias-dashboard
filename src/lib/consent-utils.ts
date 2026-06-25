export type ConsentType = 'authorized' | 'no_face' | 'not_authorized';

export function mapConsent(value: string | null | undefined): ConsentType {
  if (!value || value === 'Não autorizo' || value === 'not_authorized' || value === 'Não') return 'not_authorized';
  if (
    value === 'Apenas para uso interno' ||
    value === 'Autorizo, mas o rosto não é exposto' ||
    value === 'no_face'
  ) return 'no_face';
  return 'authorized';
}
