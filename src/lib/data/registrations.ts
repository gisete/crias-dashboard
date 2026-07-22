import { supabaseClient } from '@/lib/supabase/client';
import type { RegistrationWithDetails, Child } from '@/types/database';
import { getTodayLisbon } from '@/lib/date-utils';

export interface ResyncResult {
  success: boolean;
  error?: string;
  updated?: {
    parentName: string | null;
    phone: string | null;
    childrenCount: number;
  };
  family?: { parent_name: string; phone: string | null };
  children?: Child[];
}

export interface MonthStats {
  total: number;
  pendentes: number;
  pagos: number;
  expectedRevenue: number;
}

export interface StatusCounts {
  todos: number;
  pendente: number;
  a_pagar: number;
  lembrete: number;
  pago_confirmado: number;
  cancelado: number;
}

export async function fetchRegistrations(
  month: string,
  year: number,
  status?: string
): Promise<RegistrationWithDetails[]> {
  let query = supabaseClient
    .from('registrations')
    .select('*, family:families(*), children(*)')
    .eq('month', month)
    .eq('year', year)
    .order('submitted_at', { ascending: false, nullsFirst: false });

  if (status && status !== 'todos') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('fetchRegistrations error:', error);
    return [];
  }

  return (data ?? []) as unknown as RegistrationWithDetails[];
}

export async function fetchMonthStats(month: string, year: number): Promise<MonthStats> {
  const { data, error } = await supabaseClient
    .from('registrations')
    .select('status, total_price')
    .eq('month', month)
    .eq('year', year);

  if (error) {
    console.error('fetchMonthStats error:', error);
    return { total: 0, pendentes: 0, pagos: 0, expectedRevenue: 0 };
  }

  const regs = data ?? [];
  return {
    total: regs.length,
    pendentes: regs.filter((r) => r.status === 'pendente').length,
    pagos: regs.filter((r) => r.status === 'pago_confirmado').length,
    expectedRevenue: regs
      .filter((r) => r.status !== 'cancelado')
      .reduce((sum, r) => sum + (r.total_price ?? 0), 0),
  };
}

export async function fetchStatusCounts(month: string, year: number): Promise<StatusCounts> {
  const { data, error } = await supabaseClient
    .from('registrations')
    .select('status')
    .eq('month', month)
    .eq('year', year);

  if (error) {
    console.error('fetchStatusCounts error:', error);
    return { todos: 0, pendente: 0, a_pagar: 0, lembrete: 0, pago_confirmado: 0, cancelado: 0 };
  }

  const regs = data ?? [];
  return {
    todos: regs.length,
    pendente: regs.filter((r) => r.status === 'pendente').length,
    a_pagar: regs.filter((r) => r.status === 'a_pagar').length,
    lembrete: regs.filter((r) => r.status === 'lembrete').length,
    pago_confirmado: regs.filter((r) => r.status === 'pago_confirmado').length,
    cancelado: regs.filter((r) => r.status === 'cancelado').length,
  };
}

export async function getAvailableMonths(year: number): Promise<number[]> {
  const { data, error } = await supabaseClient
    .from('months')
    .select('month')
    .eq('year', year)
    .eq('status', 'active')
    .order('month');

  if (error) {
    console.error('getAvailableMonths error:', error);
    return [];
  }

  return (data ?? []).map((r) => r.month as number);
}

export async function getAvailableYears(): Promise<number[]> {
  const { data, error } = await supabaseClient
    .from('months')
    .select('year')
    .order('year');

  if (error) {
    console.error('getAvailableYears error:', error);
    return [];
  }

  return [...new Set((data ?? []).map((r) => r.year as number))];
}

export async function getLatestActiveMonth(): Promise<{ month: number; year: number } | null> {
  const { data, error } = await supabaseClient
    .from('months')
    .select('year, month')
    .eq('status', 'active')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return { year: data.year, month: data.month };
}

export async function getCurrentActiveMonth(): Promise<{ month: number; year: number } | null> {
  const [year, month] = getTodayLisbon().split('-').map(Number);

  const { data, error } = await supabaseClient
    .from('months')
    .select('year, month')
    .eq('status', 'active')
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (error || !data) return null;
  return { year: data.year, month: data.month };
}

export async function createMonth(
  year: number,
  month: number,
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch('/api/months', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year, month }),
  });

  if (!res.ok) {
    const data = await res.json();
    return { success: false, error: data.error };
  }

  return { success: true };
}

export async function updateRegistration(
  id: string,
  updates: Record<string, unknown>
): Promise<{ success: boolean }> {
  const { error } = await supabaseClient
    .from('registrations')
    .update(updates)
    .eq('id', id);

  if (error) console.error('updateRegistration error:', error);
  return { success: !error };
}

export async function updateFamily(
  id: string,
  updates: Record<string, unknown>
): Promise<{ success: boolean }> {
  const { error } = await supabaseClient
    .from('families')
    .update(updates)
    .eq('id', id);

  if (error) console.error('updateFamily error:', error);
  return { success: !error };
}

export async function updateChild(
  id: string,
  updates: Record<string, unknown>
): Promise<{ success: boolean }> {
  const { error } = await supabaseClient
    .from('children')
    .update(updates)
    .eq('id', id);

  if (error) console.error('updateChild error:', error);
  return { success: !error };
}

export async function deleteRegistration(
  registrationId: string,
): Promise<{ success: boolean; error?: string }> {
  const { data: reg, error: fetchError } = await supabaseClient
    .from('registrations')
    .select('family_id')
    .eq('id', registrationId)
    .single();

  if (fetchError || !reg) {
    return { success: false, error: 'Inscrição não encontrada' };
  }

  const familyId = reg.family_id as string;

  const { error: deleteError } = await supabaseClient
    .from('registrations')
    .delete()
    .eq('id', registrationId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  const { count, error: countError } = await supabaseClient
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .eq('family_id', familyId);

  if (!countError && count === 0) {
    await supabaseClient.from('families').delete().eq('id', familyId);
  }

  return { success: true };
}

export async function updateRegistrationStatus(
  id: string,
  newStatus: string
): Promise<{ success: boolean }> {
  const res = await fetch(`/api/registrations/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
  });
  return { success: res.ok };
}

export async function updateRegistrationDates(
  id: string,
  dates: string[]
): Promise<{ success: boolean }> {
  const res = await fetch(`/api/registrations/${id}/dates`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dates }),
  });
  return { success: res.ok };
}

export async function resyncRegistration(id: string): Promise<ResyncResult> {
  const res = await fetch(`/api/registrations/${id}/resync`, { method: 'POST' });
  const data = await res.json();

  if (!res.ok) {
    return { success: false, error: data.error ?? 'Erro ao sincronizar.' };
  }

  return data as ResyncResult;
}
