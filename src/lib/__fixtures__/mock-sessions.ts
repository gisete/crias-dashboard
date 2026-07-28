import type { Session, SessionChild, ConsentType } from '@/types/sessions';

const PT_MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

let scCounter = 0;
function sc(
  childName: string,
  birthDate: string,
  responsavelName: string,
  consent: ConsentType,
  hasPhotoPlan: boolean,
  perSessionValue: number,
  registrationStatus: string,
  photosReady: boolean = false,
): SessionChild {
  scCounter += 1;
  return {
    sessionChildId: `sc-mock-${String(scCounter).padStart(3, '0')}`,
    childName,
    birthDate,
    responsavelName,
    consent,
    hasPhotoPlan,
    perSessionValue,
    registrationStatus,
    photosReady,
  };
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
      sc('Alice Pinto',         '2020-08-14', 'Susana Pinto', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Beatriz Figueiredo',  '2020-09-25', 'Rui Figueiredo', 'authorized',     true,  16.5, 'pago_confirmado', true),
      sc('Dinis Santos',        '2023-02-18', 'Catarina Santos', 'no_face',        false, 14,   'pendente'),
      sc('Gabriel Rocha',       '2020-02-18', 'Francisco Rocha', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Leonor Lopes',        '2021-04-30', 'Patrícia Lopes', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Pedro Ferreira',      '2023-03-15', 'Maria João Ferreira', 'not_authorized', false, 14,   'a_pagar'),
    ],
  },
  {
    id: 'ses-002',
    date: '2026-07-04',
    slot: 'tarde',
    capacity: 16,
    children: [
      sc('Afonso Almeida',      '2019-06-05', 'Teresa Almeida', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Âmbar Correia',       '2022-06-15', 'Sérgio Correia', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Constança Oliveira',  '2021-09-03', 'Nuno Oliveira', 'no_face',        false, 11,   'pago_confirmado'),
      sc('Érica Cunha',         '2022-04-15', 'Diogo Cunha', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Francisco Rocha',     '2020-04-22', 'Maria Rocha', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Henrique Costa',      '2019-12-15', 'Teresa Costa', 'authorized',     true,  16.5, 'pago_confirmado', true),
      sc('Inês Marques',        '2023-05-07', 'Pedro Marques', 'not_authorized', false, 14,   'lembrete'),
      sc('João Silva',          '2019-11-03', 'Carlos Silva', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Margarida Cunha',     '2022-03-07', 'Diogo Cunha', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Martim Neves',        '2020-10-31', 'Bruno Neves', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Óscar Pereira',       '2023-08-03', 'Mónica Pereira', 'no_face',        false, 14,   'pendente'),
      sc('Rafael Ribeiro',      '2020-07-12', 'Vera Ribeiro', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Rodrigo Barros',      '2021-12-20', 'Luísa Barros', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Tomás Cardoso',       '2023-01-14', 'Inês Cardoso', 'authorized',     false, 14,   'a_pagar'),
    ],
  },

  // ── 5 de Julho (Domingo) ────────────────────────────────────────
  {
    id: 'ses-003',
    date: '2026-07-05',
    slot: 'manhã',
    capacity: 16,
    children: [
      sc('Gabriela Sousa',      '2022-01-09', 'Luís Sousa', 'authorized',     false, 13,   'pago_confirmado'),
      sc('Sara Baptista',       '2022-09-29', 'Mário Baptista', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Simão Sousa',         '2023-06-22', 'Vera Sousa', 'not_authorized', false, 14,   'pendente'),
    ],
  },

  // ── 11 de Julho (Sábado) ────────────────────────────────────────
  {
    id: 'ses-004',
    date: '2026-07-11',
    slot: 'manhã',
    capacity: 16,
    children: [
      sc('Alice Pinto',         '2020-08-14', 'Susana Pinto', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Beatriz Figueiredo',  '2020-09-25', 'Rui Figueiredo', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Constança Oliveira',  '2021-09-03', 'Nuno Oliveira', 'no_face',        false, 11,   'pago_confirmado'),
      sc('Dinis Santos',        '2023-02-18', 'Catarina Santos', 'no_face',        false, 14,   'pendente'),
      sc('Francisco Rocha',     '2020-04-22', 'Maria Rocha', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Gabriel Rocha',       '2020-02-18', 'Francisco Rocha', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Henrique Costa',      '2019-12-15', 'Teresa Costa', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Íris Macedo',         '2020-06-28', 'Diana Macedo', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('João Pinto',          '2021-08-20', 'Susana Pinto', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Leonor Lopes',        '2021-04-30', 'Patrícia Lopes', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Lourenço Matos',      '2019-04-17', 'Catarina Matos', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Martim Lopes',        '2023-08-12', 'Patrícia Lopes', 'no_face',        false, 12.5, 'pago_confirmado'),
      sc('Núria Alves',         '2019-04-16', 'Filipa Alves', 'authorized',     true,  16.5, 'a_pagar'),
      sc('Sofia Ferreira',      '2022-05-08', 'Maria João Ferreira', 'not_authorized', false, 12.5, 'lembrete'),
      sc('Tomás Vieira',        '2019-11-08', 'Helena Vieira', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Vasco Teixeira',      '2021-05-17', 'Joana Teixeira', 'authorized',     false, 11,   'pendente'),
    ],
  },
  {
    id: 'ses-005',
    date: '2026-07-11',
    slot: 'tarde',
    capacity: 16,
    children: [
      sc('Afonso Almeida',      '2019-06-05', 'Teresa Almeida', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Érica Cunha',         '2022-04-15', 'Diogo Cunha', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Inês Marques',        '2023-05-07', 'Pedro Marques', 'no_face',        false, 14,   'a_pagar'),
      sc('Margarida Cunha',     '2022-03-07', 'Diogo Cunha', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Matilde Monteiro',    '2022-10-01', 'Hugo Monteiro',               'not_authorized', false, 13,   'pago_confirmado'),
      sc('Rafael Ribeiro',      '2020-07-12', 'Vera Ribeiro', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Rodrigo Barros',      '2021-12-20', 'Luísa Barros', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Yasmin Monteiro',     '2022-07-13', 'Hugo Monteiro',               'not_authorized', false, 13,   'lembrete'),
    ],
  },

  // ── 12 de Julho (Domingo) ───────────────────────────────────────
  {
    id: 'ses-006',
    date: '2026-07-12',
    slot: 'manhã',
    capacity: 16,
    children: [
      sc('Gabriela Sousa',      '2022-01-09', 'Luís Sousa', 'authorized',     false, 13,   'pago_confirmado'),
      sc('Paula Gomes',         '2021-01-25', 'António Gomes', 'no_face',        true,  16.5, 'pago_confirmado'),
      sc('Sara Baptista',       '2022-09-29', 'Mário Baptista', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Tomás Cardoso',       '2023-01-14', 'Inês Cardoso', 'authorized',     false, 14,   'pendente'),
      sc('Úrsula Melo',         '2023-03-22', 'Gonçalo Melo', 'authorized',     false, 14,   'pago_confirmado'),
    ],
  },

  // ── 18 de Julho (Sábado) ────────────────────────────────────────
  {
    id: 'ses-007',
    date: '2026-07-18',
    slot: 'manhã',
    capacity: 16,
    children: [
      sc('Alice Pinto',         '2020-08-14', 'Susana Pinto', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Âmbar Correia',       '2022-06-15', 'Sérgio Correia', 'authorized',     true,  16.5, 'a_pagar'),
      sc('Beatriz Figueiredo',  '2020-09-25', 'Rui Figueiredo', 'authorized',     true,  16.5, 'pago_confirmado', true),
      sc('Constança Oliveira',  '2021-09-03', 'Nuno Oliveira', 'no_face',        false, 11,   'pago_confirmado'),
      sc('Gabriel Rocha',       '2020-02-18', 'Francisco Rocha', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('João Silva',          '2019-11-03', 'Carlos Silva', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Leonor Lopes',        '2021-04-30', 'Patrícia Lopes', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Lourenço Matos',      '2019-04-17', 'Catarina Matos', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Martim Lopes',        '2023-08-12', 'Patrícia Lopes', 'no_face',        false, 12.5, 'pendente'),
      sc('Matilde Monteiro',    '2022-10-01', 'Hugo Monteiro',               'not_authorized', false, 13,   'pago_confirmado'),
      sc('Rodrigo Barros',      '2021-12-20', 'Luísa Barros', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Vasco Teixeira',      '2021-05-17', 'Joana Teixeira', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Xavier Cruz',         '2020-02-06', 'Carlos Cruz', 'authorized',     false, 12.5, 'lembrete'),
    ],
  },
  {
    id: 'ses-008',
    date: '2026-07-18',
    slot: 'tarde',
    capacity: 16,
    children: [
      sc('Núria Alves',         '2019-04-16', 'Filipa Alves', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Paula Gomes',         '2021-01-25', 'António Gomes', 'no_face',        true,  16.5, 'pago_confirmado'),
    ],
  },

  // ── 19 de Julho (Domingo) ───────────────────────────────────────
  {
    id: 'ses-009',
    date: '2026-07-19',
    slot: 'tarde',
    capacity: 16,
    children: [
      sc('Dinis Santos',        '2023-02-18', 'Catarina Santos', 'no_face',        false, 14,   'pago_confirmado'),
      sc('Francisco Rocha',     '2020-04-22', 'Maria Rocha', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Henrique Costa',      '2019-12-15', 'Teresa Costa', 'authorized',     true,  16.5, 'a_pagar'),
      sc('Íris Macedo',         '2020-06-28', 'Diana Macedo', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Simão Sousa',         '2023-06-22', 'Vera Sousa', 'not_authorized', false, 14,   'lembrete'),
      sc('Tomás Vieira',        '2019-11-08', 'Helena Vieira', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Úrsula Melo',         '2023-03-22', 'Gonçalo Melo', 'authorized',     false, 14,   'pendente'),
    ],
  },

  // ── 25 de Julho (Sábado) ────────────────────────────────────────
  {
    id: 'ses-010',
    date: '2026-07-25',
    slot: 'manhã',
    capacity: 16,
    children: [
      sc('Alice Pinto',         '2020-08-14', 'Susana Pinto', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Beatriz Figueiredo',  '2020-09-25', 'Rui Figueiredo', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Dinis Santos',        '2023-02-18', 'Catarina Santos', 'no_face',        false, 14,   'pago_confirmado'),
      sc('Gabriel Rocha',       '2020-02-18', 'Francisco Rocha', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Inês Marques',        '2023-05-07', 'Pedro Marques', 'no_face',        false, 14,   'a_pagar'),
      sc('Leonor Lopes',        '2021-04-30', 'Patrícia Lopes', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Lourenço Matos',      '2019-04-17', 'Catarina Matos', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Margarida Cunha',     '2022-03-07', 'Diogo Cunha', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Pedro Ferreira',      '2023-03-15', 'Maria João Ferreira', 'not_authorized', false, 14,   'pago_confirmado'),
      sc('Sara Baptista',       '2022-09-29', 'Mário Baptista', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Xavier Cruz',         '2020-02-06', 'Carlos Cruz', 'authorized',     false, 12.5, 'lembrete'),
    ],
  },
  {
    id: 'ses-011',
    date: '2026-07-25',
    slot: 'tarde',
    capacity: 16,
    children: [
      sc('Afonso Almeida',      '2019-06-05', 'Teresa Almeida', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Âmbar Correia',       '2022-06-15', 'Sérgio Correia', 'authorized',     true,  16.5, 'pago_confirmado', true),
      sc('Constança Oliveira',  '2021-09-03', 'Nuno Oliveira', 'no_face',        false, 11,   'pago_confirmado'),
      sc('Érica Cunha',         '2022-04-15', 'Diogo Cunha', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Francisco Rocha',     '2020-04-22', 'Maria Rocha', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('Gabriela Sousa',      '2022-01-09', 'Luís Sousa', 'authorized',     false, 13,   'pago_confirmado'),
      sc('Henrique Costa',      '2019-12-15', 'Teresa Costa', 'authorized',     true,  16.5, 'a_pagar'),
      sc('Íris Macedo',         '2020-06-28', 'Diana Macedo', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('João Pinto',          '2021-08-20', 'Susana Pinto', 'authorized',     false, 12.5, 'pago_confirmado'),
      sc('João Silva',          '2019-11-03', 'Carlos Silva', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Martim Lopes',        '2023-08-12', 'Patrícia Lopes', 'no_face',        false, 12.5, 'pago_confirmado'),
      sc('Martim Neves',        '2020-10-31', 'Bruno Neves', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Matilde Monteiro',    '2022-10-01', 'Hugo Monteiro',               'not_authorized', false, 13,   'pago_confirmado'),
      sc('Rafael Ribeiro',      '2020-07-12', 'Vera Ribeiro', 'authorized',     false, 11,   'pago_confirmado'),
      sc('Rodrigo Barros',      '2021-12-20', 'Luísa Barros', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Simão Sousa',         '2023-06-22', 'Vera Sousa', 'not_authorized', false, 14,   'lembrete'),
      sc('Vasco Teixeira',      '2021-05-17', 'Joana Teixeira', 'authorized',     false, 11,   'pago_confirmado'),
    ],
  },

  // ── 26 de Julho (Domingo) ───────────────────────────────────────
  {
    id: 'ses-012',
    date: '2026-07-26',
    slot: 'tarde',
    capacity: 16,
    children: [
      sc('Maria Silva',         '2021-07-20', 'Carlos Silva', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Núria Alves',         '2019-04-16', 'Filipa Alves', 'authorized',     true,  16.5, 'pago_confirmado'),
      sc('Óscar Pereira',       '2023-08-03', 'Mónica Pereira', 'no_face',        false, 14,   'pago_confirmado'),
      sc('Yasmin Monteiro',     '2022-07-13', 'Hugo Monteiro',               'not_authorized', false, 13,   'pago_confirmado'),
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
