"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRealtimeRegistrations } from "@/hooks/useRealtimeRegistrations";
import type { Session, SessionChild } from "@/types/sessions";
import { fetchSessionsByMonth } from "@/lib/data/sessions";
import {
	getAvailableMonths,
	getAvailableYears,
	getCurrentActiveMonth,
	getLatestActiveMonth,
} from "@/lib/data/registrations";
import { MONTH_NAMES } from "@/lib/months";
import { getTodayLisbon } from "@/lib/date-utils";
import { MonthSelector } from "@/components/inscricoes/MonthSelector";
import { SessionSearch } from "@/components/sessoes/SessionSearch";
import { SessionFilters, type SlotFilter } from "@/components/sessoes/SessionFilters";
import { SessionCard } from "@/components/sessoes/SessionCard";

export default function SessoesPage() {
	const [month, setMonth] = useState<string | null>(null);
	const [year, setYear] = useState<number | null>(null);
	const [slotFilter, setSlotFilter] = useState<SlotFilter>("todas");
	const [searchQuery, setSearchQuery] = useState("");
	const [sessions, setSessions] = useState<Session[]>([]);
	const [availableYears, setAvailableYears] = useState<number[]>([]);
	const [monthsByYear, setMonthsByYear] = useState<Record<number, number[]>>({});

	useEffect(() => {
		async function loadDefaultMonth() {
			const current = await getCurrentActiveMonth();
			if (current) {
				setMonth(MONTH_NAMES[current.month - 1]);
				setYear(current.year);
				return;
			}
			const latest = await getLatestActiveMonth();
			if (latest) {
				setMonth(MONTH_NAMES[latest.month - 1]);
				setYear(latest.year);
				return;
			}
			const now = new Date();
			setMonth(MONTH_NAMES[now.getMonth()]);
			setYear(now.getFullYear());
		}
		loadDefaultMonth();
	}, []);

	const refreshAvailableMonths = useCallback(async () => {
		const years = await getAvailableYears();
		setAvailableYears(years);
		const entries = await Promise.all(years.map(async (y) => [y, await getAvailableMonths(y)] as const));
		setMonthsByYear(Object.fromEntries(entries));
	}, []);

	useEffect(() => {
		refreshAvailableMonths();
	}, [refreshAvailableMonths]);

	const refetch = useCallback(() => {
		if (!month || !year) return;
		fetchSessionsByMonth(month, year).then(setSessions);
	}, [month, year]);

	useEffect(() => {
		refetch();
	}, [refetch]);

	useRealtimeRegistrations(refetch);

	function handleMonthChange(m: string, y: number) {
		setMonth(m);
		setYear(y);
		setSearchQuery("");
	}

	const visibleSessions = useMemo(() => {
		return sessions.filter((s) => {
			const confirmed = s.children.filter((c) => c.registrationStatus === "pago_confirmado");
			if (confirmed.length === 0) return false;
			if (slotFilter !== "todas" && s.slot !== slotFilter) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				return confirmed.some((c) => c.childName.toLowerCase().includes(q));
			}
			return true;
		});
	}, [sessions, slotFilter, searchQuery]);

	function getDisplayChildren(session: Session): SessionChild[] {
		const confirmed = session.children.filter((c) => c.registrationStatus === "pago_confirmado");
		if (!searchQuery.trim()) return confirmed;
		const q = searchQuery.toLowerCase().trim();
		return confirmed.filter((c) => c.childName.toLowerCase().includes(q));
	}

	const today = getTodayLisbon();

	const upcomingSessions = useMemo(() => visibleSessions.filter((s) => s.date >= today), [visibleSessions, today]);

	const pastSessions = useMemo(
		() =>
			visibleSessions
				.filter((s) => s.date < today)
				.slice()
				.reverse(),
		[visibleSessions, today],
	);

	if (!month || !year) return null;

	return (
		<>
			<div className="flex items-center justify-between gap-3 md:gap-4 mb-4 md:mb-8">
				<h1 className="text-headline-md md:text-headline-lg text-gray-900">Sessões</h1>
				<div className="flex items-center gap-2">
					<MonthSelector
						month={month}
						year={year}
						onChange={handleMonthChange}
						availableYears={availableYears.length > 0 ? availableYears : undefined}
						getAvailableMonths={availableYears.length > 0 ? (y) => monthsByYear[y] ?? [] : undefined}
					/>
				</div>
			</div>

			<div className="flex flex-col gap-4 mb-8">
				<SessionSearch value={searchQuery} onChange={setSearchQuery} />
				<SessionFilters active={slotFilter} onChange={setSlotFilter} />
			</div>

			{visibleSessions.length === 0 ? (
				<div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-16 text-center">
					<p className="text-body-lg text-gray-500">Nenhuma sessão encontrada.</p>
				</div>
			) : (
				<div className="flex flex-col gap-8">
					<div className="flex flex-col gap-4">
						{upcomingSessions.length > 0 && <h2 className="text-title-lg text-gray-500">Próximas sessões</h2>}
						{upcomingSessions.length > 0 ? (
							upcomingSessions.map((session) => (
								<SessionCard
									key={session.id}
									session={session}
									displayChildren={getDisplayChildren(session)}
									isToday={session.date === today}
								/>
							))
						) : pastSessions.length > 0 ? (
							<p className="text-body-md text-gray-500">Sem sessões futuras neste mês</p>
						) : null}
					</div>

					{pastSessions.length > 0 && (
						<div className="flex flex-col gap-4">
							<h2 className="text-title-lg text-gray-500">Sessões passadas</h2>
							{pastSessions.map((session) => (
								<SessionCard key={session.id} session={session} displayChildren={getDisplayChildren(session)} />
							))}
						</div>
					)}
				</div>
			)}
		</>
	);
}
