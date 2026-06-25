export type SlotFilter = 'todas' | 'manhã' | 'tarde';

const FILTERS: { key: SlotFilter; label: string; activeClass: string }[] = [
  {
    key: 'todas',
    label: 'Todas',
    activeClass: 'bg-on-surface text-white border-on-surface',
  },
  {
    key: 'manhã',
    label: 'Manhã',
    activeClass: 'bg-gray-200 text-gray-900 border-gray-400',
  },
  {
    key: 'tarde',
    label: 'Tarde',
    activeClass: 'bg-gray-200 text-gray-900 border-gray-400',
  },
];

const INACTIVE =
  'bg-surface-container-lowest text-gray-600 border-surface-container-highest hover:bg-surface-container-low';

interface Props {
  active: SlotFilter;
  onChange: (filter: SlotFilter) => void;
}

export function SessionFilters({ active, onChange }: Props) {
  return (
    <div className="flex gap-3">
      {FILTERS.map(({ key, label, activeClass }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-5 py-2.5 rounded-lg text-label-md border transition-colors ${
            active === key ? activeClass : INACTIVE
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
