import type { StatusCounts } from '@/lib/data/registrations';

type FilterKey = 'todos' | 'pendente' | 'a_pagar' | 'lembrete' | 'pago_confirmado' | 'cancelado';

const FILTERS: { key: FilterKey; label: string; activeClass: string; inactiveClass: string }[] = [
  {
    key: 'todos',
    label: 'Todos',
    activeClass: 'bg-on-surface text-white border-on-surface shadow-sm',
    inactiveClass: 'bg-surface-container-lowest text-gray-600 border-surface-container-highest hover:bg-surface-container-low',
  },
  {
    key: 'pendente',
    label: 'Pendente',
    activeClass: 'bg-error text-white border-error',
    inactiveClass: 'bg-error-container/20 text-error border-error-container/40',
  },
  {
    key: 'a_pagar',
    label: 'A Pagar',
    activeClass: 'bg-status-apagar-text text-white border-status-apagar-text',
    inactiveClass: 'bg-status-apagar-bg text-status-apagar-text border-status-apagar-text/25',
  },
  {
    key: 'lembrete',
    label: 'Lembrete',
    activeClass: 'bg-status-lembrete-text text-white border-status-lembrete-text',
    inactiveClass: 'bg-status-lembrete-bg text-status-lembrete-text border-status-lembrete-text/25',
  },
  {
    key: 'pago_confirmado',
    label: 'Pago',
    activeClass: 'bg-status-pago-text text-white border-status-pago-text',
    inactiveClass: 'bg-status-pago-bg text-status-pago-text border-status-pago-text/25',
  },
  {
    key: 'cancelado',
    label: 'Cancelado',
    activeClass: 'bg-gray-500 text-white border-gray-500',
    inactiveClass: 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200',
  },
];

interface Props {
  active: FilterKey;
  counts: StatusCounts;
  onChange: (filter: FilterKey) => void;
}

export function StatusFilter({ active, counts, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-4 mb-10">
      {FILTERS.map(({ key, label, activeClass, inactiveClass }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-6 py-3 rounded-lg text-label-md border transition-colors ${
            active === key ? activeClass : inactiveClass
          }`}
        >
          {label} ({counts[key]})
        </button>
      ))}
    </div>
  );
}
