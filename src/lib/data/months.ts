import { supabaseClient } from '@/lib/supabase/client';
import { MONTH_NAMES } from '@/lib/months';
import type { Month } from '@/types/database';

export interface MonthWithCount {
  id: string;
  year: number;
  month: number;
  status: 'active' | 'archived';
  registrationCount: number;
  created_at: string;
}

export async function fetchAllMonths(): Promise<MonthWithCount[]> {
  const { data: months, error: monthsError } = await supabaseClient
    .from('months')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (monthsError || !months) {
    console.error('fetchAllMonths error:', monthsError);
    return [];
  }

  const { data: registrations, error: regsError } = await supabaseClient
    .from('registrations')
    .select('month_id, month, year');

  if (regsError) {
    console.error('fetchAllMonths registrations error:', regsError);
  }

  const regs = registrations ?? [];

  return (months as Month[]).map((m) => {
    const monthName = MONTH_NAMES[m.month - 1];
    const registrationCount = regs.filter(
      (r) =>
        r.month_id === m.id ||
        (!r.month_id && r.month === monthName && r.year === m.year),
    ).length;
    return { ...m, registrationCount };
  });
}

export async function updateMonthStatus(
  id: string,
  status: 'active' | 'archived',
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`/api/months/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const data = await res.json();
    return { success: false, error: data.error };
  }

  return { success: true };
}

export async function deleteMonth(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`/api/months/${id}`, { method: 'DELETE' });

  if (!res.ok) {
    const data = await res.json();
    return { success: false, error: data.error };
  }

  return { success: true };
}
