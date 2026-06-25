export interface WebhookPayload {
  source: string;
  tally_submission_id: string | null;
  submitted_at: string | null;
  mes: string | null;
  responsavel_nome: string | null;
  responsavel_email: string | null;
  responsavel_telefone: string | null;
  crianca_1_nome: string | null;
  crianca_1_nascimento: string | null;
  crianca_2_nome: string | null;
  crianca_2_nascimento: string | null;
  crianca_3_nome: string | null;
  crianca_3_nascimento: string | null;
  plano: string | null;
  datas_selecionadas: string[] | null;
  consentimento: string | null;
  nif: string | null;
  voucher: string | null;
  notas: string | null;
}
