"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRealtimeRegistrations } from "@/hooks/useRealtimeRegistrations";
import type { Session, SessionChild } from "@/types/sessions";
import { fetchSessionsByMonth, setPhotosReady, setSessionPhotos } from "@/lib/data/sessions";
import {
	getAvailableMonths,
	getAvailableYears,
	getCurrentActiveMonth,
	getLatestActiveMonth,
} from "@/lib/data/registrations";
import { MONTH_NAMES, MONTH_TO_NUMBER } from "@/lib/months";
import { getTodayLisbon } from "@/lib/date-utils";
import { readStoredMonth } from "@/lib/month-storage";
import { MonthSelector } from "@/components/inscricoes/MonthSelector";
import { SessionSearch } from "@/components/sessoes/SessionSearch";
import { SessionFilters, type SlotFilter } from "@/components/sessoes/SessionFilters";
import { SessionCard } from "@/components/sessoes/SessionCard";

export default function SessoesPage() {
	const [month, setMonth] = useState<string | null>(null);
	const [year, setYear] = useState<number | null>(null);
	const [slotFilter, setSlotFilter] = useState<SlotFilter>("todas");
	const [searchQuery, setSearchQuery] = useState("");
	const [photosOnly, setPhotosOnly] = useState(false);
	const [sessions, setSessions] = useState<Session[]>([]);
	const [availableYears, setAvailableYears] = useState<number[]>([]);
	const [monthsByYear, setMonthsByYear] = useState<Record<number, number[]>>({});

	const refreshAvailableMonths = useCallback(async () => {
		const years = await getAvailableYears();
		setAvailableYears(years);
		const entries = await Promise.all(years.map(async (y) => [y, await getAvailableMonths(y)] as const));
		const monthsMap = Object.fromEntries(entries);
		setMonthsByYear(monthsMap);
		return monthsMap;
	}, []);

	useEffect(() => {
		async function init() {
			const monthsMap = await refreshAvailableMonths();
			const stored = readStoredMonth();
			if (stored && monthsMap[stored.year]?.includes(MONTH_TO_NUMBER[stored.month])) {
				setMonth(stored.month);
				setYear(stored.year);
				return;
			}
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
		init();
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

	const totalPhotoCount = useMemo(
		() =>
			sessions.reduce(
				(sum, s) =>
					sum + s.children.filter((c) => c.registrationStatus === "pago_confirmado" && c.hasPhotoPlan).length,
				0,
			),
		[sessions],
	);

	const visibleSessions = useMemo(() => {
		return sessions.filter((s) => {
			const confirmed = s.children.filter((c) => c.registrationStatus === "pago_confirmado");
			if (confirmed.length === 0) return false;
			if (photosOnly && !confirmed.some((c) => c.hasPhotoPlan)) return false;
			if (slotFilter !== "todas" && s.slot !== slotFilter) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				const searchable = photosOnly ? confirmed.filter((c) => c.hasPhotoPlan) : confirmed;
				return searchable.some((c) => c.childName.toLowerCase().includes(q));
			}
			return true;
		});
	}, [sessions, slotFilter, searchQuery, photosOnly]);

	function getDisplayChildren(session: Session): SessionChild[] {
		const confirmed = session.children.filter((c) => c.registrationStatus === "pago_confirmado");
		let filtered = photosOnly ? confirmed.filter((c) => c.hasPhotoPlan) : confirmed;
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			filtered = filtered.filter((c) => c.childName.toLowerCase().includes(q));
		}
		return filtered;
	}

	async function handleTogglePhotosReady(sessionChildId: string, ready: boolean) {
		const prevSessions = sessions;
		setSessions((prev) =>
			prev.map((s) => ({
				...s,
				children: s.children.map((c) =>
					c.sessionChildId === sessionChildId ? { ...c, photosReady: ready } : c,
				),
			})),
		);
		const result = await setPhotosReady(sessionChildId, ready);
		if (!result.success) {
			setSessions(prevSessions);
		}
	}

	async function handleToggleSessionPhotos(sessionChildIds: string[], hasPhotos: boolean) {
		const prevSessions = sessions;
		const idSet = new Set(sessionChildIds);

		let registrationId: string | null = null;
		for (const s of sessions) {
			const found = s.children.find((c) => idSet.has(c.sessionChildId));
			if (found) {
				registrationId = found.registrationId;
				break;
			}
		}

		const flipped = sessions.map((s) => ({
			...s,
			children: s.children.map((c) =>
				idSet.has(c.sessionChildId) ? { ...c, hasPhotoPlan: hasPhotos } : c,
			),
		}));

		let nextSessions = flipped;
		if (registrationId) {
			const photoSessionIds = new Set<string>();
			for (const s of flipped) {
				const hasPhotoChild = s.children.some(
					(c) => c.registrationId === registrationId && c.hasPhotoPlan,
				);
				if (hasPhotoChild) photoSessionIds.add(s.id);
			}
			const count = photoSessionIds.size;
			nextSessions = flipped.map((s) => ({
				...s,
				children: s.children.map((c) =>
					c.registrationId === registrationId ? { ...c, assignedPhotoCount: count } : c,
				),
			}));
		}

		setSessions(nextSessions);

		const results = await Promise.all(sessionChildIds.map((id) => setSessionPhotos(id, hasPhotos)));
		if (results.some((r) => !r.success)) {
			console.error("handleToggleSessionPhotos: failed to persist photo flag");
			setSessions(prevSessions);
		}
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

			<div className="flex justify-end mb-6">
				<button
					onClick={() => setPhotosOnly((v) => !v)}
					className="inline-flex items-center gap-2.5 touch-manipulation select-none"
					role="switch"
					aria-checked={photosOnly}
				>
					<div
						className={`relative w-10 h-[22px] rounded-full transition-colors ${
							photosOnly ? "bg-on-primary-fixed" : "bg-gray-300"
						}`}
					>
						<div
							className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-[left] ${
								photosOnly ? "left-5" : "left-[2px]"
							}`}
						/>
					</div>
					<span className="text-body-md font-medium text-gray-900">Só fotos</span>
					<span className="text-body-md text-gray-500">({totalPhotoCount})</span>
				</button>
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
									onTogglePhotosReady={handleTogglePhotosReady}
									onToggleSessionPhotos={handleToggleSessionPhotos}
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
								<SessionCard
								key={session.id}
								session={session}
								displayChildren={getDisplayChildren(session)}
								onTogglePhotosReady={handleTogglePhotosReady}
								onToggleSessionPhotos={handleToggleSessionPhotos}
							/>
							))}
						</div>
					)}
				</div>
			)}
		</>
	);
}
