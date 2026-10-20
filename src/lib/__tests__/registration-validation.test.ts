import { getMissingFields, formatMissingFields, buildBlockedToast, type ValidationRegistration } from '../registration-validation';

function buildReg(overrides: Partial<ValidationRegistration> = {}): ValidationRegistration {
  return {
    month: 'julho',
    plan: '1 sessão (14€)',
    unit_price: 14,
    num_sessions: 1,
    num_children: 1,
    selected_dates: ['5 (manhã)'],
    family: { parent_name: 'Maria Silva', email: 'maria@example.com', phone: '912345678' },
    children: [{ name: 'Ana', removed_at: null }],
    ...overrides,
  };
}

describe('getMissingFields — target pendente', () => {
  it('never reports missing fields regardless of data completeness', () => {
    const reg = buildReg({ family: { parent_name: '', email: '', phone: null }, plan: '' });
    expect(getMissingFields(reg, { target: 'pendente' })).toEqual([]);
  });
});

describe('getMissingFields — full check (non-silent, non-pendente target)', () => {
  it('reports a blank parent name', () => {
    const reg = buildReg({ family: { parent_name: '', email: 'maria@example.com', phone: null } });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'parent_name', label: 'Nome do responsável' },
    ]);
  });

  it('reports a whitespace-only parent name', () => {
    const reg = buildReg({ family: { parent_name: '   ', email: 'maria@example.com', phone: null } });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'parent_name', label: 'Nome do responsável' },
    ]);
  });

  it('reports a blank email', () => {
    const reg = buildReg({ family: { parent_name: 'Maria', email: '', phone: null } });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'email', label: 'Email' },
    ]);
  });

  it('reports an email with no "@"', () => {
    const reg = buildReg({ family: { parent_name: 'Maria', email: 'maria.example.com', phone: null } });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'email', label: 'Email' },
    ]);
  });

  it('reports an email with "@" but no later "."', () => {
    const reg = buildReg({ family: { parent_name: 'Maria', email: 'maria@examplecom', phone: null } });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'email', label: 'Email' },
    ]);
  });

  it('reports an email missing a domain after the dot ("a@.")', () => {
    const reg = buildReg({ family: { parent_name: 'Maria', email: 'a@.', phone: null } });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'email', label: 'Email' },
    ]);
  });

  it('reports an email missing the local part before "@" ("@.com")', () => {
    const reg = buildReg({ family: { parent_name: 'Maria', email: '@.com', phone: null } });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'email', label: 'Email' },
    ]);
  });

  it('reports a blank month', () => {
    const reg = buildReg({ month: '' });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'month', label: 'Mês' },
    ]);
  });

  it('reports a blank plan', () => {
    const reg = buildReg({ plan: '' });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'plan', label: 'Plano' },
    ]);
  });

  it('reports plan sanity when the plan is set but unit_price is 0', () => {
    const reg = buildReg({ plan: 'Plano desconhecido', unit_price: 0 });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'plan_sanity', label: 'Plano (preço ou n.º de sessões não reconhecido)' },
    ]);
  });

  it('reports plan sanity when the plan is set but num_sessions is 0', () => {
    const reg = buildReg({ num_sessions: 0 });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'plan_sanity', label: 'Plano (preço ou n.º de sessões não reconhecido)' },
    ]);
  });

  it('reports num_children below 1', () => {
    const reg = buildReg({ num_children: 0 });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'num_children', label: 'Número de crianças' },
    ]);
  });

  it('reports missing child name when there are no active children', () => {
    const reg = buildReg({ children: [] });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'child_name', label: 'Nome da criança' },
    ]);
  });

  it('ignores removed children when checking for a named child', () => {
    const reg = buildReg({ children: [{ name: 'Ana', removed_at: '2026-01-01T00:00:00.000Z' }] });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'child_name', label: 'Nome da criança' },
    ]);
  });

  it('reports missing child name when every active child has a blank name', () => {
    const reg = buildReg({ children: [{ name: '  ', removed_at: null }] });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'child_name', label: 'Nome da criança' },
    ]);
  });

  it('reports missing selected dates when the list is empty', () => {
    const reg = buildReg({ selected_dates: [] });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'selected_dates', label: 'Datas selecionadas' },
    ]);
  });

  it('reports missing selected dates when every entry is blank', () => {
    const reg = buildReg({ selected_dates: ['  ', ''] });
    expect(getMissingFields(reg, { target: 'a_pagar' })).toEqual([
      { field: 'selected_dates', label: 'Datas selecionadas' },
    ]);
  });

  it('reports every missing field together, in order, for a fully empty registration', () => {
    const reg = buildReg({
      family: { parent_name: '', email: '', phone: null },
      month: '',
      plan: '',
      num_children: 0,
      children: [],
      selected_dates: [],
    });
    expect(getMissingFields(reg, { target: 'a_pagar' }).map((m) => m.field)).toEqual([
      'parent_name',
      'email',
      'month',
      'plan',
      'num_children',
      'child_name',
      'selected_dates',
    ]);
  });

  it.each(['a_pagar', 'lembrete', 'pago_confirmado', 'cancelado'] as const)(
    'runs the full check for target %s',
    (target) => {
      const reg = buildReg({ family: { parent_name: '', email: 'maria@example.com', phone: null } });
      expect(getMissingFields(reg, { target })).toEqual([
        { field: 'parent_name', label: 'Nome do responsável' },
      ]);
    },
  );
});

describe('getMissingFields — silent checks', () => {
  it('checks only child name and selected dates for target pago_confirmado', () => {
    const reg = buildReg({
      family: { parent_name: '', email: '', phone: null },
      month: '',
      plan: '',
      children: [],
      selected_dates: [],
    });
    expect(getMissingFields(reg, { target: 'pago_confirmado', silent: true }).map((m) => m.field)).toEqual([
      'child_name',
      'selected_dates',
    ]);
  });

  it('returns nothing for a complete registration at target pago_confirmado', () => {
    const reg = buildReg();
    expect(getMissingFields(reg, { target: 'pago_confirmado', silent: true })).toEqual([]);
  });

  it.each(['a_pagar', 'lembrete', 'cancelado'] as const)(
    'returns nothing for silent target %s regardless of missing data',
    (target) => {
      const reg = buildReg({ family: { parent_name: '', email: '', phone: null }, children: [] });
      expect(getMissingFields(reg, { target, silent: true })).toEqual([]);
    },
  );
});

describe('getMissingFields — complete registration', () => {
  it.each(['pendente', 'a_pagar', 'lembrete', 'pago_confirmado', 'cancelado'] as const)(
    'returns [] for target %s, silent or not',
    (target) => {
      const reg = buildReg();
      expect(getMissingFields(reg, { target, silent: false })).toEqual([]);
      expect(getMissingFields(reg, { target, silent: true })).toEqual([]);
    },
  );
});

describe('formatMissingFields', () => {
  it('formats a single label with no connector', () => {
    expect(formatMissingFields([{ field: 'a', label: 'A' }])).toBe('A');
  });

  it('joins two labels with "e"', () => {
    expect(formatMissingFields([{ field: 'a', label: 'A' }, { field: 'b', label: 'B' }])).toBe('A e B');
  });

  it('joins three or more labels with commas and a final "e"', () => {
    expect(formatMissingFields([
      { field: 'a', label: 'A' },
      { field: 'b', label: 'B' },
      { field: 'c', label: 'C' },
    ])).toBe('A, B e C');
  });

  it('returns an empty string for no missing fields', () => {
    expect(formatMissingFields([])).toBe('');
  });
});

describe('buildBlockedToast', () => {
  it('uses "Falta" (singular) for exactly one missing field', () => {
    expect(buildBlockedToast([{ field: 'parent_name', label: 'Nome do responsável' }])).toBe(
      'Não foi possível alterar o estado. Falta: Nome do responsável.',
    );
  });

  it('uses "Faltam" (plural) for more than one missing field', () => {
    expect(buildBlockedToast([
      { field: 'parent_name', label: 'Nome do responsável' },
      { field: 'email', label: 'Email' },
    ])).toBe('Não foi possível alterar o estado. Faltam: Nome do responsável e Email.');
  });
});
