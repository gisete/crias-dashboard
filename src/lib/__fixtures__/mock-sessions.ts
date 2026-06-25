import type { Session, SessionChild, ConsentType } from '@/types/sessions';

const PT_MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function sc(
  childName: string,
  birthDate: string,
  responsavelName: string,
  phone: string | null,
  consent: ConsentType,
  hasPhotoPlan: boolean,
  perSessionValue: number,
  registrationStatus: string,
): SessionChild {
  return { childName, birthDate, responsavelName, phone, consent, hasPhotoPlan, perSessionValue, registrationStatus };
}

// July 2026: Saturdays = 4, 11, 18, 25 / Sundays = 5, 12, 19, 26
const MOCK_SESSIONS: Session[] = [
  // ── 4 de Julho (Sábado) ─────────────────────────────────────────
  {
    id: 'ses-001',
    date: '2026-07-04',
    slot: 'manhã',
    capacity: 16,
    children: [
      sc('Alice Pinto',         '2020-08-14', 'Susana Pinto',         '+351 915 222 333', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Beatriz Figueiredo',  '2020-09-25', 'Rui Figueiredo',       '+351 919 876 543', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Dinis Santos',        '2023-02-18', 'Catarina Santos',      '+351 967 999 000', 'no_face',        false, 14,   'pendente'),
      sc('Gabriel Rocha',       '2020-02-18', 'Francisco Rocha',      '+351 912 111 222', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Leonor Lopes',        '2021-04-30', 'Patrícia Lopes',       '+351 937 654 321', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Pedro Ferreira',      '2023-03-15', 'Maria João Ferreira',  '+351 934 567 891', 'not_authorized', false, 14,   'a_pagar'),
    ],
  },
  {
    id: 'ses-002',
    date: '2026-07-04',
    slot: 'tarde',
    capacity: 16,
    children: [
      sc('Afonso Almeida',      '2019-06-05', 'Teresa Almeida',       '+351 961 333 444', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Âmbar Correia',       '2022-06-15', 'Sérgio Correia',       '+351 915 111 222', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Constança Oliveira',  '2021-09-03', 'Nuno Oliveira',        '+351 939 777 888', 'no_face',        false, 11,   'pago_confirmado'),
      sc('Érica Cunha',         '2022-04-15', 'Diogo Cunha',          '+351 964 444 555', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Francisco Rocha',     '2020-04-22', 'Maria Rocha',          '+351 963 222 444', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Henrique Costa',      '2019-12-15', 'Teresa Costa',         '+351 961 444 666', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Inês Marques',        '2023-05-07', 'Pedro Marques',        '+351 966 555 777', 'not_authorized', false, 14,   'lembrete'),
      sc('João Silva',          '2019-11-03', 'Carlos Silva',         '+351 963 210 987', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Margarida Cunha',     '2022-03-07', 'Diogo Cunha',          '+351 964 444 555', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Martim Neves',        '2020-10-31', 'Bruno Neves',          '+351 964 888 000', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Óscar Pereira',       '2023-08-03', 'Mónica Pereira',       '+351 961 111 222', 'no_face',        false, 14,   'pendente'),
      sc('Rafael Ribeiro',      '2020-07-12', 'Vera Ribeiro',         '+351 966 333 444', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Rodrigo Barros',      '2021-12-20', 'Luísa Barros',         '+351 938 765 432', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Tomás Cardoso',       '2023-01-14', 'Inês Cardoso',         '+351 966 543 210', 'authorized',     false, 14,   'a_pagar'),
    ],
  },

  // ── 5 de Julho (Domingo) ────────────────────────────────────────
  {
    id: 'ses-003',
    date: '2026-07-05',
    slot: 'manhã',
    capacity: 16,
    children: [
      sc('Gabriela Sousa',      '2022-01-09', 'Luís Sousa',           '+351 915 333 555', 'authorized',     false, 13,   'pago_confirmado'),
      sc('Sara Baptista',       '2022-09-29', 'Mário Baptista',       '+351 912 444 555', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Simão Sousa',         '2023-06-22', 'Vera Sousa',           '+351 913 555 666', 'not_authorized', false, 14,   'pendente'),
    ],
  },

  // ── 11 de Julho (Sábado) ────────────────────────────────────────
  {
    id: 'ses-004',
    date: '2026-07-11',
    slot: 'manhã',
    capacity: 16,
    children: [
      sc('Alice Pinto',         '2020-08-14', 'Susana Pinto',         '+351 915 222 333', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Beatriz Figueiredo',  '2020-09-25', 'Rui Figueiredo',       '+351 919 876 543', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Constança Oliveira',  '2021-09-03', 'Nuno Oliveira',        '+351 939 777 888', 'no_face',        false, 11,   'pago_confirmado'),
      sc('Dinis Santos',        '2023-02-18', 'Catarina Santos',      '+351 967 999 000', 'no_face',        false, 14,   'pendente'),
      sc('Francisco Rocha',     '2020-04-22', 'Maria Rocha',          '+351 963 222 444', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Gabriel Rocha',       '2020-02-18', 'Francisco Rocha',      '+351 912 111 222', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Henrique Costa',      '2019-12-15', 'Teresa Costa',         '+351 961 444 666', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Íris Macedo',         '2020-06-28', 'Diana Macedo',         '+351 919 555 666', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('João Pinto',          '2021-08-20', 'Susana Pinto',         '+351 915 222 333', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Leonor Lopes',        '2021-04-30', 'Patrícia Lopes',       '+351 937 654 321', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Lourenço Matos',      '2019-04-17', 'Catarina Matos',       '+351 967 888 999', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Martim Lopes',        '2023-08-12', 'Patrícia Lopes',       '+351 937 654 321', 'no_face',        false, 12.5, 'pago_confirmado'),
      sc('Núria Alves',         '2019-04-16', 'Filipa Alves',         '+351 919 000 111', 'authorized',     true,  16.5, 'a_pagar'),
      sc('Sofia Ferreira',      '2022-05-08', 'Maria João Ferreira',  '+351 934 567 891', 'not_authorized', false, 12.5, 'lembrete'),
      sc('Tomás Vieira',        '2019-11-08', 'Helena Vieira',        '+351 963 555 666', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Vasco Teixeira',      '2021-05-17', 'Joana Teixeira',       '+351 961 777 888', 'authorized',     false, 11,   'pendente'),
    ],
  },
  {
    id: 'ses-005',
    date: '2026-07-11',
    slot: 'tarde',
    capacity: 16,
    children: [
      sc('Afonso Almeida',      '2019-06-05', 'Teresa Almeida',       '+351 961 333 444', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Érica Cunha',         '2022-04-15', 'Diogo Cunha',          '+351 964 444 555', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Inês Marques',        '2023-05-07', 'Pedro Marques',        '+351 966 555 777', 'no_face',        false, 14,   'a_pagar'),
      sc('Margarida Cunha',     '2022-03-07', 'Diogo Cunha',          '+351 964 444 555', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Matilde Monteiro',    '2022-10-01', 'Hugo Monteiro',        null,               'not_authorized', false, 13,   'pago_confirmado'),
      sc('Rafael Ribeiro',      '2020-07-12', 'Vera Ribeiro',         '+351 966 333 444', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Rodrigo Barros',      '2021-12-20', 'Luísa Barros',         '+351 938 765 432', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Yasmin Monteiro',     '2022-07-13', 'Hugo Monteiro',        null,               'not_authorized', false, 13,   'lembrete'),
    ],
  },

  // ── 12 de Julho (Domingo) ───────────────────────────────────────
  {
    id: 'ses-006',
    date: '2026-07-12',
    slot: 'manhã',
    capacity: 16,
    children: [
      sc('Gabriela Sousa',      '2022-01-09', 'Luís Sousa',           '+351 915 333 555', 'authorized',     false, 13,   'pago_confirmado'),
      sc('Paula Gomes',         '2021-01-25', 'António Gomes',        '+351 915 222 333', 'no_face',        true,  16.5, 'pago_confirmado'),
      sc('Sara Baptista',       '2022-09-29', 'Mário Baptista',       '+351 912 444 555', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Tomás Cardoso',       '2023-01-14', 'Inês Cardoso',         '+351 966 543 210', 'authorized',     false, 14,   'pendente'),
      sc('Úrsula Melo',         '2023-03-22', 'Gonçalo Melo',         '+351 915 666 777', 'authorized',     false, 14,   'pago_confirmado'),
    ],
  },

  // ── 18 de Julho (Sábado) ────────────────────────────────────────
  {
    id: 'ses-007',
    date: '2026-07-18',
    slot: 'manhã',
    capacity: 16,
    children: [
      sc('Alice Pinto',         '2020-08-14', 'Susana Pinto',         '+351 915 222 333', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Âmbar Correia',       '2022-06-15', 'Sérgio Correia',       '+351 915 111 222', 'authorized',     true,  16.5, 'a_pagar'),
      sc('Beatriz Figueiredo',  '2020-09-25', 'Rui Figueiredo',       '+351 919 876 543', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Constança Oliveira',  '2021-09-03', 'Nuno Oliveira',        '+351 939 777 888', 'no_face',        false, 11,   'pago_confirmado'),
      sc('Gabriel Rocha',       '2020-02-18', 'Francisco Rocha',      '+351 912 111 222', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('João Silva',          '2019-11-03', 'Carlos Silva',         '+351 963 210 987', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Leonor Lopes',        '2021-04-30', 'Patrícia Lopes',       '+351 937 654 321', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Lourenço Matos',      '2019-04-17', 'Catarina Matos',       '+351 967 888 999', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Martim Lopes',        '2023-08-12', 'Patrícia Lopes',       '+351 937 654 321', 'no_face',        false, 12.5, 'pendente'),
      sc('Matilde Monteiro',    '2022-10-01', 'Hugo Monteiro',        null,               'not_authorized', false, 13,   'pago_confirmado'),
      sc('Rodrigo Barros',      '2021-12-20', 'Luísa Barros',         '+351 938 765 432', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Vasco Teixeira',      '2021-05-17', 'Joana Teixeira',       '+351 961 777 888', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Xavier Cruz',         '2020-02-06', 'Carlos Cruz',          '+351 966 888 999', 'authorized',     false, 12.5, 'lembrete'),
    ],
  },
  {
    id: 'ses-008',
    date: '2026-07-18',
    slot: 'tarde',
    capacity: 16,
    children: [
      sc('Núria Alves',         '2019-04-16', 'Filipa Alves',         '+351 919 000 111', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Paula Gomes',         '2021-01-25', 'António Gomes',        '+351 915 222 333', 'no_face',        true,  16.5, 'pago_confirmado'),
    ],
  },

  // ── 19 de Julho (Domingo) ───────────────────────────────────────
  {
    id: 'ses-009',
    date: '2026-07-19',
    slot: 'tarde',
    capacity: 16,
    children: [
      sc('Dinis Santos',        '2023-02-18', 'Catarina Santos',      '+351 967 999 000', 'no_face',        false, 14,   'pago_confirmado'),
      sc('Francisco Rocha',     '2020-04-22', 'Maria Rocha',          '+351 963 222 444', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Henrique Costa',      '2019-12-15', 'Teresa Costa',         '+351 961 444 666', 'authorized',     true,  16.5, 'a_pagar'),
      sc('Íris Macedo',         '2020-06-28', 'Diana Macedo',         '+351 919 555 666', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Simão Sousa',         '2023-06-22', 'Vera Sousa',           '+351 913 555 666', 'not_authorized', false, 14,   'lembrete'),
      sc('Tomás Vieira',        '2019-11-08', 'Helena Vieira',        '+351 963 555 666', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Úrsula Melo',         '2023-03-22', 'Gonçalo Melo',         '+351 915 666 777', 'authorized',     false, 14,   'pendente'),
    ],
  },

  // ── 25 de Julho (Sábado) ────────────────────────────────────────
  {
    id: 'ses-010',
    date: '2026-07-25',
    slot: 'manhã',
    capacity: 16,
    children: [
      sc('Alice Pinto',         '2020-08-14', 'Susana Pinto',         '+351 915 222 333', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Beatriz Figueiredo',  '2020-09-25', 'Rui Figueiredo',       '+351 919 876 543', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Dinis Santos',        '2023-02-18', 'Catarina Santos',      '+351 967 999 000', 'no_face',        false, 14,   'pago_confirmado'),
      sc('Gabriel Rocha',       '2020-02-18', 'Francisco Rocha',      '+351 912 111 222', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Inês Marques',        '2023-05-07', 'Pedro Marques',        '+351 966 555 777', 'no_face',        false, 14,   'a_pagar'),
      sc('Leonor Lopes',        '2021-04-30', 'Patrícia Lopes',       '+351 937 654 321', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Lourenço Matos',      '2019-04-17', 'Catarina Matos',       '+351 967 888 999', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Margarida Cunha',     '2022-03-07', 'Diogo Cunha',          '+351 964 444 555', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Pedro Ferreira',      '2023-03-15', 'Maria João Ferreira',  '+351 934 567 891', 'not_authorized', false, 14,   'pago_confirmado'),
      sc('Sara Baptista',       '2022-09-29', 'Mário Baptista',       '+351 912 444 555', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Xavier Cruz',         '2020-02-06', 'Carlos Cruz',          '+351 966 888 999', 'authorized',     false, 12.5, 'lembrete'),
    ],
  },
  {
    id: 'ses-011',
    date: '2026-07-25',
    slot: 'tarde',
    capacity: 16,
    children: [
      sc('Afonso Almeida',      '2019-06-05', 'Teresa Almeida',       '+351 961 333 444', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Âmbar Correia',       '2022-06-15', 'Sérgio Correia',       '+351 915 111 222', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Constança Oliveira',  '2021-09-03', 'Nuno Oliveira',        '+351 939 777 888', 'no_face',        false, 11,   'pago_confirmado'),
      sc('Érica Cunha',         '2022-04-15', 'Diogo Cunha',          '+351 964 444 555', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Francisco Rocha',     '2020-04-22', 'Maria Rocha',          '+351 963 222 444', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Gabriela Sousa',      '2022-01-09', 'Luís Sousa',           '+351 915 333 555', 'authorized',     false, 13,   'pago_confirmado'),
      sc('Henrique Costa',      '2019-12-15', 'Teresa Costa',         '+351 961 444 666', 'authorized',     true,  16.5, 'a_pagar'),
      sc('Íris Macedo',         '2020-06-28', 'Diana Macedo',         '+351 919 555 666', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('João Pinto',          '2021-08-20', 'Susana Pinto',         '+351 915 222 333', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('João Silva',          '2019-11-03', 'Carlos Silva',         '+351 963 210 987', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Martim Lopes',        '2023-08-12', 'Patrícia Lopes',       '+351 937 654 321', 'no_face',        false, 12.5, 'pago_confirmado'),
      sc('Martim Neves',        '2020-10-31', 'Bruno Neves',          '+351 964 888 000', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Matilde Monteiro',    '2022-10-01', 'Hugo Monteiro',        null,               'not_authorized', false, 13,   'pago_confirmado'),
      sc('Rafael Ribeiro',      '2020-07-12', 'Vera Ribeiro',         '+351 966 333 444', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Rodrigo Barros',      '2021-12-20', 'Luísa Barros',         '+351 938 765 432', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Simão Sousa',         '2023-06-22', 'Vera Sousa',           '+351 913 555 666', 'not_authorized', false, 14,   'lembrete'),
      sc('Vasco Teixeira',      '2021-05-17', 'Joana Teixeira',       '+351 961 777 888', 'authorized',     false, 11,   'pago_confirmado'),
    ],
  },

  // ── 26 de Julho (Domingo) ───────────────────────────────────────
  {
    id: 'ses-012',
    date: '2026-07-26',
    slot: 'tarde',
    capacity: 16,
    children: [
      sc('Maria Silva',         '2021-07-20', 'Carlos Silva',         '+351 963 210 987', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Núria Alves',         '2019-04-16', 'Filipa Alves',         '+351 919 000 111', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Óscar Pereira',       '2023-08-03', 'Mónica Pereira',       '+351 961 111 222', 'no_face',        false, 14,   'pago_confirmado'),
      sc('Yasmin Monteiro',     '2022-07-13', 'Hugo Monteiro',        null,               'not_authorized', false, 13,   'pago_confirmado'),
    ],
  },
];

export function getSessionsByMonth(month: string, year: number): Session[] {
  const monthIndex = PT_MONTHS.indexOf(month) + 1; // 1-12
  return MOCK_SESSIONS.filter((s) => {
    const [y, m] = s.date.split('-').map(Number);
    return y === year && m === monthIndex;
  });
}
