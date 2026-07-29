// Deploy test comment — safe to remove
export type TallyFormConfig = {
  formId: string;
  label: string;
  fields: {
    email: string;
    responsavel_nome: string;
    responsavel_telefone: string;
    is_existing_family: string;
    criancas_nomes: string[];
    criancas_nascimentos: string[];
    plano_individual: string;
    plano_pack: string;
    datas_selecionadas: string;
    consentimento: string;
    voucher: string;
    notas: string;
    nif: string;
  };
};

const FORM_A: TallyFormConfig = {
  formId: 'aQ0Xyb',
  label: 'A',
  fields: {
    email: 'question_PEzr61',
    responsavel_nome: 'question_VlzN0j',
    responsavel_telefone: 'question_E1x6Xl',
    is_existing_family: 'question_MLb090',
    criancas_nomes: ['question_4kKO8r', 'question_2kKoee', 'question_ZV2eNV'],
    criancas_nascimentos: ['question_pAVbJZ', 'question_1KEANO', 'question_MO5e6g'],
    plano_individual: 'question_Qr74DY',
    plano_pack: 'question_eAaz6x',
    datas_selecionadas: 'question_Wo8qNe',
    consentimento: 'question_ax2z6Z',
    voucher: 'question_AJB9dy',
    notas: 'question_B1xeXe',
    nif: 'question_kANzyr',
  },
};

const FORM_B: TallyFormConfig = {
  formId: 'QKp8Nl',
  label: 'B',
  fields: {
    email: 'question_qWEV2d',
    responsavel_nome: 'question_NYBoeW',
    responsavel_telefone: 'question_QYBV6A',
    is_existing_family: 'question_XYB0Kd',
    criancas_nomes: ['question_e2xRdE', 'question_WYpzvP', 'question_aErd8E'],
    criancas_nascimentos: ['question_1v2V1O', 'question_MYdR9g', 'question_JDkzNY'],
    plano_individual: 'question_6vQNXO',
    plano_pack: 'question_7v9x89',
    datas_selecionadas: 'question_br4d02',
    consentimento: 'question_ADbvVW',
    voucher: 'question_KDB1qk',
    notas: 'question_LYMpQO',
    nif: 'question_pWPOlZ',
  },
};

const FORMS: TallyFormConfig[] = [FORM_A, FORM_B];

export function getFormConfig(formId: string): TallyFormConfig | undefined {
  return FORMS.find((f) => f.formId === formId);
}
