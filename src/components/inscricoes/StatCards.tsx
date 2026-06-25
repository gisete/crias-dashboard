import type { MonthStats } from '@/lib/data/registrations';

function formatRevenue(value: number): string {
  return value.toLocaleString('pt-PT') + '€';
}

export function StatCards({ stats }: { stats: MonthStats }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-8 mb-12 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-surface-container-highest">
      <div className="flex flex-col md:flex-row justify-between divide-y md:divide-y-0 md:divide-x divide-surface-container-highest">
        <div className="flex flex-col gap-2 flex-1 pb-6 md:pb-0 md:pr-8">
          <span className="text-label-sm text-gray-500 uppercase tracking-wider">Total Inscrições</span>
          <span className="text-display text-gray-900">{stats.total}</span>
        </div>
        <div className="flex flex-col gap-2 flex-1 py-6 md:py-0 md:px-8">
          <span className="text-label-sm text-gray-500 uppercase tracking-wider">Pendente</span>
          <span className="text-display text-error">{stats.pendentes}</span>
        </div>
        <div className="flex flex-col gap-2 flex-1 py-6 md:py-0 md:px-8">
          <span className="text-label-sm text-gray-500 uppercase tracking-wider">Confirmado</span>
          <span className="text-display text-gray-900">{stats.pagos}</span>
        </div>
        <div className="flex flex-col gap-2 flex-1 pt-6 md:pt-0 md:pl-8">
          <span className="text-label-sm text-gray-500 uppercase tracking-wider">Receita Esperada</span>
          <span className="text-display text-gray-900">{formatRevenue(stats.expectedRevenue)}</span>
        </div>
      </div>
    </div>
  );
}
