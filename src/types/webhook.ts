export interface WebhookPayload {
  source: string;
  tally_submission_id: string | null;
  submitted_at: string | null;
  mes: string | null;
  responsavel_nome: string | null;
  responsavel_email: string | null;
  responsavel_telefone: string | null;
  criancas_nomes: string[] | string | null;
  criancas_nascimentos: string[] | string | null;
  plano: string | null;
  datas_selecionadas: string[] | string | null;
  consentimento: string | null;
  nif: string | null;
  voucher: string | null;
  notas: string | null;
}
