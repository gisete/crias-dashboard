export type RegistrationStatus = 'pendente' | 'a_pagar' | 'lembrete' | 'pago_confirmado' | 'cancelado';

export interface Family {
  id: string;
  parent_name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

export interface Registration {
  id: string;
  family_id: string;
  month_id: string | null;
  tally_submission_id: string | null;
  submitted_at: string | null;
  month: string;
  year: number;
  plan: string;
  unit_price: number;
  num_sessions: number;
  num_children: number;
  total_price: number;
  selected_dates: string[];
  status: RegistrationStatus;
  image_consent: string | null;
  has_photos: boolean;
  voucher_code: string | null;
  notes: string | null;
  nif: string | null;
  invoice_requested: boolean;
  webhook_error: boolean;
  webhook_error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Child {
  id: string;
  registration_id: string;
  name: string;
  date_of_birth: string | null;
  created_at: string;
}

export interface RegistrationWithDetails extends Registration {
  family: Family;
  children: Child[];
}

export interface Month {
  id: string;
  year: number;
  month: number;
  status: 'active' | 'archived';
  created_at: string;
}

export interface Session {
  id: string;
  date: string;
  slot: 'manhã' | 'tarde';
  month: string;
  year: number;
  capacity: number;
  created_at: string;
}

export interface SessionChild {
  id: string;
  session_id: string;
  child_id: string;
  registration_id: string;
  present: boolean | null;
  marked_at: string | null;
  created_at: string;
}
