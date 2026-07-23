import type { StatusCounts } from '@/lib/data/registrations';

type FilterKey = 'todos' | 'pendente' | 'a_pagar' | 'lembrete' | 'pago_confirmado' | 'cancelado';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendente', label: 'Pendente' },
  { key: 'a_pagar', label: 'A Pagar' },
  { key: 'lembrete', label: 'Lembrete' },
  { key: 'pago_confirmado', label: 'Pago' },
  { key: 'cancelado', label: 'Cancelado' },
];

const ACTIVE_CLASS = 'bg-on-surface text-white border-on-surface shadow-sm';
const INACTIVE_CLASS =
  'bg-surface-container text-gray-600 border-surface-container-highest hover:bg-surface-container-high';

interface Props {
  active: FilterKey;
  counts: StatusCounts;
  onChange: (filter: FilterKey) => void;
}

export function StatusFilter({ active, counts, onChange }: Props) {
  return (
    <div className="flex gap-1 sm:gap-1.5 mb-8 sm:mb-10 overflow-x-auto sm:overflow-visible sm:flex-wrap -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 sm:pb-0 scrollbar-none">
      {FILTERS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`shrink-0 px-4 sm:px-6 py-3 rounded-lg text-label-md border transition-colors whitespace-nowrap touch-manipulation select-none ${
            active === key ? ACTIVE_CLASS : INACTIVE_CLASS
          }`}
        >
          {label} ({counts[key]})
        </button>
      ))}
    </div>
  );
}
