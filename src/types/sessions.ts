import type { ConsentType } from '@/lib/consent-utils';
export type { ConsentType };
export type Slot = 'manhã' | 'tarde';

export interface SessionChild {
  childName: string;
  birthDate: string;          // ISO date, e.g. '2021-07-20'
  responsavelName: string;
  phone: string | null;
  consent: ConsentType;
  hasPhotoPlan: boolean;
  perSessionValue: number;    // euros
  registrationStatus: string; // 'pago_confirmado' | 'pendente' | 'a_pagar' | 'lembrete'
}

export interface Session {
  id: string;
  date: string;     // ISO date, e.g. '2026-07-04'
  slot: Slot;
  children: SessionChild[];
  capacity: number;
}
