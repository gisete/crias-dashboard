import type { ConsentType } from '@/lib/consent-utils';
export type { ConsentType };
export type Slot = 'manhã' | 'tarde';

export interface SessionChild {
  sessionChildId: string;
  childName: string;
  birthDate: string;          // ISO date, e.g. '2021-07-20'
  responsavelName: string;
  consent: ConsentType;
  hasPhotoPlan: boolean;
  perSessionValue: number;    // euros
  photosReady: boolean;
  registrationStatus: string; // 'pago_confirmado' | 'pendente' | 'a_pagar' | 'lembrete'
  fotoSessions: number;
  assignedPhotoCount: number;
  registrationId: string;
}

export interface Session {
  id: string;
  date: string;     // ISO date, e.g. '2026-07-04'
  slot: Slot;
  children: SessionChild[];
  capacity: number;
}
