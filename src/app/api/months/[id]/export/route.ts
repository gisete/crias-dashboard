import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { MONTH_NAMES, MONTH_LABELS } from '@/lib/months';
import { calculateAge } from '@/lib/age-calculator';
import { STATUS_LABELS } from '@/lib/status-utils';
import type { RegistrationStatus } from '@/types/database';

const CSV_HEADERS = [
  'Criança(s)',
  'Data Nascimento',
  'Idade',
  'Responsável',
  'Email',
  'Telefone',
  'Plano',
  'Sessões',
  'Datas Selecionadas',
  'Valor',
  'Estado',
  'NIF',
  'Voucher',
  'Consentimento',
  'Fotos',
  'Notas',
];

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatDate(dateOfBirth: string | null): string {
  if (!dateOfBirth) return '';
  const d = new Date(dateOfBirth);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

interface ExportChild {
  name: string;
  date_of_birth: string | null;
}

interface ExportFamily {
  parent_name: string;
  email: string;
  phone: string | null;
}

interface ExportRegistration {
  plan: string;
  num_sessions: number;
  selected_dates: string[];
  total_price: number;
  status: RegistrationStatus;
  nif: string | null;
  voucher_code: string | null;
  image_consent: string | null;
  has_photos: boolean;
  notes: string | null;
  family: ExportFamily;
  children: ExportChild[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: monthRecord, error: monthError } = await supabase
    .from('months')
    .select('id, year, month')
    .eq('id', id)
    .maybeSingle();

  if (monthError) {
    return NextResponse.json({ error: monthError.message }, { status: 500 });
  }

  if (!monthRecord) {
    return NextResponse.json({ error: 'Month not found' }, { status: 404 });
  }

  const monthName = MONTH_NAMES[monthRecord.month - 1];

  const { data: registrations, error: regsError } = await supabase
    .from('registrations')
    .select('*, family:families(parent_name, email, phone), children(name, date_of_birth)')
    .eq('month', monthName)
    .eq('year', monthRecord.year)
    .order('created_at', { ascending: true });

  if (regsError) {
    return NextResponse.json({ error: regsError.message }, { status: 500 });
  }

  const rows = (registrations as unknown as ExportRegistration[]).map((reg) => {
    const childNames = reg.children.map((c) => c.name).join(' + ');
    const childDobs = reg.children.map((c) => formatDate(c.date_of_birth)).join(' + ');
    const childAges = reg.children
      .map((c) => (c.date_of_birth ? calculateAge(c.date_of_birth) : ''))
      .join(' / ');

    return [
      childNames,
      childDobs,
      childAges,
      reg.family.parent_name,
      reg.family.email,
      reg.family.phone ?? '',
      reg.plan,
      String(reg.num_sessions),
      reg.selected_dates.join(', '),
      `${reg.total_price}€`,
      STATUS_LABELS[reg.status],
      reg.nif ?? '',
      reg.voucher_code ?? '',
      reg.image_consent ?? '',
      reg.has_photos ? 'Sim' : 'Não',
      reg.notes ?? '',
    ];
  });

  const csvLines = [CSV_HEADERS, ...rows].map((row) => row.map(csvField).join(','));
  const csv = '﻿' + csvLines.join('\r\n');

  const monthLabel = MONTH_LABELS[monthRecord.month - 1]
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const filename = `inscricoes-${monthLabel}-${monthRecord.year}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
