import { supabaseClient } from '@/lib/supabase/client';
import type { Session, SessionChild, ConsentType, Slot } from '@/types/sessions';
import { parsePlan } from '@/lib/plan-parser';
import { MONTH_TO_NUMBER } from '@/lib/months';
import { mapConsent } from '@/lib/consent-utils';

export { getAvailableYears } from './registrations';

// Hard-coded until months table drives the picker; swap for a Supabase query later.
export function getAvailableMonths(year: number): number[] {
  if (year === 2026) return [7];
  return [];
}

function parseDateStr(dateStr: string): { day: number; slot: Slot } | null {
  const match = dateStr.match(/^(\d+)\s+\((manhã|tarde)\)$/);
  if (!match) return null;
  return { day: parseInt(match[1], 10), slot: match[2] as Slot };
}

export async function fetchSessionsByMonth(month: string, year: number): Promise<Session[]> {
  const [settingsResult, overridesResult, registrationsResult] = await Promise.all([
    supabaseClient
      .from('settings')
      .select('value')
      .eq('key', 'default_session_capacity')
      .single(),
    supabaseClient
      .from('session_overrides')
      .select('date, slot, capacity')
      .eq('year', year)
      .eq('month', month),
    supabaseClient
      .from('registrations')
      .select('plan, total_price, num_sessions, selected_dates, image_consent, status, family:families(parent_name, phone), children(name, date_of_birth)')
      .eq('month', month)
      .eq('year', year)
      .eq('status', 'pago_confirmado'),
  ]);

  const defaultCapacity = settingsResult.data
    ? Number(settingsResult.data.value)
    : 12;

  const overrideMap = new Map<string, number>();
  for (const o of overridesResult.data ?? []) {
    overrideMap.set(`${o.date}|${o.slot}`, o.capacity);
  }

  type RegRow = {
    plan: string;
    total_price: number;
    num_sessions: number;
    selected_dates: string[];
    image_consent: string | null;
    status: string;
    family: { parent_name: string; phone: string | null } | null;
    children: { name: string; date_of_birth: string | null }[];
  };

  const sessionMap = new Map<string, { day: number; slot: Slot; children: SessionChild[] }>();

  for (const reg of (registrationsResult.data ?? []) as unknown as RegRow[]) {
    const { hasPhotos } = parsePlan(reg.plan);
    const consent = mapConsent(reg.image_consent);
    const perSessionValue = reg.num_sessions > 0 ? reg.total_price / reg.num_sessions : 0;
    const responsavelName = reg.family?.parent_name ?? '';
    const phone = reg.family?.phone ?? null;
    const regChildren = Array.isArray(reg.children) ? reg.children : [];

    const flatDates = (reg.selected_dates ?? []).flatMap((s) =>
      s.includes(',') ? s.split(',').map((p) => p.trim()).filter(Boolean) : [s],
    );

    for (const dateStr of flatDates) {
      const parsed = parseDateStr(dateStr);
      if (!parsed) continue;

      const { day, slot } = parsed;
      const key = `${day}|${slot}`;

      if (!sessionMap.has(key)) {
        sessionMap.set(key, { day, slot, children: [] });
      }

      for (const child of regChildren) {
        sessionMap.get(key)!.children.push({
          childName: child.name,
          birthDate: child.date_of_birth ?? '',
          responsavelName,
          phone,
          consent,
          hasPhotoPlan: hasPhotos,
          perSessionValue,
          registrationStatus: reg.status,
        });
      }
    }
  }

  const monthNum = MONTH_TO_NUMBER[month] ?? 1;

  return Array.from(sessionMap.entries())
    .sort(([aKey], [bKey]) => {
      const [aDay, aSlot] = aKey.split('|');
      const [bDay, bSlot] = bKey.split('|');
      const dayDiff = parseInt(aDay, 10) - parseInt(bDay, 10);
      if (dayDiff !== 0) return dayDiff;
      return aSlot === 'manhã' ? -1 : 1;
    })
    .map(([key, { day, slot, children }]) => ({
      id: `${month}-${year}-${day}-${slot}`,
      date: `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      slot,
      children,
      capacity: overrideMap.get(key) ?? defaultCapacity,
    }));
}
