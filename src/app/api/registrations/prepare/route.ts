import { NextRequest, NextResponse } from 'next/server';
import { getFormConfig } from '@/lib/tally-config';
import {
  unwrapTallyValue,
  collectTallyFields,
  joinTallyArray,
  combinePlans,
  isExistingFamily,
} from '@/lib/tally-fields';

interface TallyPreparePayload {
  formId: string;
  submissionId: string;
  createdAt: string;
  formName: string;
  fields: {
    mes?: string | null;
    [key: string]: unknown;
  };
  fieldsById: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret');
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: TallyPreparePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const formConfig = getFormConfig(payload.formId);
  if (!formConfig) {
    return NextResponse.json({ error: 'Unknown form', formId: payload.formId }, { status: 400 });
  }

  const fieldsById = payload.fieldsById ?? {};
  const email = unwrapTallyValue(fieldsById[formConfig.fields.email]);
  if (!email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  }

  return NextResponse.json(
    {
      tally_submission_id: payload.submissionId,
      submitted_at: payload.createdAt,
      source: payload.formName,
      form_id: payload.formId,
      mes: payload.fields?.mes ?? null,
      email,
      is_existing_family: isExistingFamily(fieldsById[formConfig.fields.is_existing_family]),
      nome: unwrapTallyValue(fieldsById[formConfig.fields.responsavel_nome]),
      telefone: unwrapTallyValue(fieldsById[formConfig.fields.responsavel_telefone]),
      criancas_nomes: collectTallyFields(fieldsById, formConfig.fields.criancas_nomes),
      criancas_nascimentos: collectTallyFields(fieldsById, formConfig.fields.criancas_nascimentos),
      plano: combinePlans(
        fieldsById[formConfig.fields.plano_individual],
        fieldsById[formConfig.fields.plano_pack]
      ),
      datas_selecionadas: joinTallyArray(fieldsById[formConfig.fields.datas_selecionadas]),
      consentimento: unwrapTallyValue(fieldsById[formConfig.fields.consentimento]),
      nif: unwrapTallyValue(fieldsById[formConfig.fields.nif]),
      voucher: unwrapTallyValue(fieldsById[formConfig.fields.voucher]),
      notas: unwrapTallyValue(fieldsById[formConfig.fields.notas]),
    },
    { status: 200 }
  );
}
