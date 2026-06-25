import type { RegistrationStatus } from '@/types/database';

export const STATUS_LABELS: Record<RegistrationStatus, string> = {
  pendente: 'Pendente',
  a_pagar: 'A Pagar',
  lembrete: 'Lembrete',
  pago_confirmado: 'Pago',
  cancelado: 'Cancelado',
};

export const STATUS_PILL: Record<RegistrationStatus, string> = {
  pendente: 'bg-error-container/30 text-error',
  a_pagar: 'bg-status-apagar-bg text-status-apagar-text',
  lembrete: 'bg-status-lembrete-bg text-status-lembrete-text',
  pago_confirmado: 'bg-status-pago-bg text-status-pago-text',
  cancelado: 'bg-gray-100 text-gray-500',
};

export const ALL_STATUSES: RegistrationStatus[] = [
  'pendente',
  'a_pagar',
  'lembrete',
  'pago_confirmado',
  'cancelado',
];
