import type { MonthStats } from "@/lib/data/registrations";

function formatRevenue(value: number): string {
	return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "€";
}

export function StatCards({ stats }: { stats: MonthStats }) {
	return (
		<div className="bg-surface-container-lowest rounded-xl p-6 sm:p-8 mb-8 sm:mb-12 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-surface-container-highest">
			<div className="grid grid-cols-2 gap-x-4 gap-y-8 md:flex md:justify-between md:divide-x md:divide-surface-container-highest">
				<div className="flex flex-col gap-2 md:flex-1 md:pr-8">
					<span className="text-[12px] md:text-label-sm text-gray-500 uppercase tracking-wider">Total</span>
					<span className="text-headline-md md:text-display text-gray-900">{stats.total}</span>
				</div>
				<div className="flex flex-col gap-2 md:flex-1 md:px-8">
					<span className="text-[12px] md:text-label-sm text-gray-500 uppercase tracking-wider">Pendente</span>
					<span className="text-headline-md md:text-display text-error">{stats.pendentes}</span>
				</div>
				<div className="flex flex-col gap-2 md:flex-1 md:px-8">
					<span className="text-[12px] md:text-label-sm text-gray-500 uppercase tracking-wider">Confirmado</span>
					<span className="text-headline-md md:text-display text-gray-900">{stats.pagos}</span>
				</div>
				<div className="flex flex-col gap-2 md:flex-1 md:pl-8">
					<span className="text-[12px] md:text-label-sm text-gray-500 uppercase tracking-wider">Receita</span>
					<span className="text-headline-md md:text-display text-gray-900">{formatRevenue(stats.expectedRevenue)}</span>
				</div>
			</div>
		</div>
	);
}
