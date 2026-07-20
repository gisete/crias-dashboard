import { buildStatusWebhookPayload, type WebhookRegistration, type WebhookFamily, type WebhookChild } from '../make-webhook';

const baseRegistration: WebhookRegistration = {
  id: 'reg-1',
  month: 'julho',
  year: 2026,
  plan: '2 sessões + 6 registos fotográficos (40€)',
  unit_price: 40,
  total_price: 80,
  num_sessions: 2,
  num_children: 2,
  has_photos: true,
  selected_dates: ['5 (manhã)', '12 (tarde)'],
  nif: '123456789',
  voucher_code: 'VERAO10',
  notes: 'Alergia a frutos secos',
};

const baseFamily: WebhookFamily = {
  parent_name: 'Maria Silva',
  email: 'maria@example.com',
  phone: '912345678',
};

const twoChildren: WebhookChild[] = [
  { name: 'Ana', date_of_birth: '2018-03-01' },
  { name: 'Bruno', date_of_birth: '2020-07-15' },
];

describe('buildStatusWebhookPayload', () => {
  it('builds a full payload with children joined by commas', () => {
    const result = buildStatusWebhookPayload(baseRegistration, baseFamily, twoChildren, 'pago_confirmado');

    expect(result).toEqual({
      status: 'pago_confirmado',
      registration_id: 'reg-1',
      responsavel_nome: 'Maria Silva',
      responsavel_email: 'maria@example.com',
      responsavel_telefone: '912345678',
      criancas_nomes: 'Ana, Bruno',
      mes: 'julho',
      year: 2026,
      plano: '2 sessões + 6 registos fotográficos (40€)',
      unit_price: 40,
      total_price: 80,
      num_sessions: 2,
      num_children: 2,
      has_photos: true,
      datas_selecionadas: '5 (manhã), 12 (tarde)',
      nif: '123456789',
      voucher_code: 'VERAO10',
      notas: 'Alergia a frutos secos',
    });
  });

  it('represents missing optional fields as null', () => {
    const registration: WebhookRegistration = {
      ...baseRegistration,
      nif: null,
      voucher_code: null,
      notes: null,
    };

    const result = buildStatusWebhookPayload(registration, baseFamily, twoChildren, 'a_pagar');

    expect(result.nif).toBeNull();
    expect(result.voucher_code).toBeNull();
    expect(result.notas).toBeNull();
  });

  it('represents an empty children array as an empty string', () => {
    const result = buildStatusWebhookPayload(baseRegistration, baseFamily, [], 'lembrete');

    expect(result.criancas_nomes).toBe('');
  });
});
