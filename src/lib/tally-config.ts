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

// Placeholder for Form B — will be filled when field IDs are available
// const FORM_B: TallyFormConfig = { ... };

const FORMS: TallyFormConfig[] = [FORM_A];

export function getFormConfig(formId: string): TallyFormConfig | undefined {
  return FORMS.find((f) => f.formId === formId);
}
