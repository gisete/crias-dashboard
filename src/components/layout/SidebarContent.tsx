"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardText, CalendarCheck, CalendarDots, UserCheck, SignOut, type Icon } from "@phosphor-icons/react";
import { PendingCounter } from "./PendingCounter";

interface NavItem {
	href: string;
	label: string;
	icon: Icon;
	isActive: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
	{
		href: "/",
		label: "Inscrições",
		icon: ClipboardText,
		isActive: (p) => p === "/",
	},
	{
		href: "/sessoes",
		label: "Sessões",
		icon: CalendarCheck,
		isActive: (p) => p === "/sessoes",
	},
	{
		href: "/meses",
		label: "Meses",
		icon: CalendarDots,
		isActive: (p) => p.startsWith("/meses"),
	},
	{
		href: "/presencas",
		label: "Presenças",
		icon: UserCheck,
		isActive: (p) => p.startsWith("/presencas"),
	},
];

interface Props {
	onNavigate?: () => void;
	onLogout: () => void;
}

export function SidebarContent({ onNavigate, onLogout }: Props) {
	const pathname = usePathname();

	return (
		<>
			<div className="mb-12 flex flex-col items-start gap-1">
				<span className="text-headline-md font-semibold text-white">Crias na Floresta</span>
				<span className="text-label-md text-gray-300">Gestão</span>
			</div>

			<nav className="flex-1 flex flex-col gap-2">
				{NAV_ITEMS.map(({ href, label, icon: Icon, isActive }) => {
					const active = isActive(pathname);
					return (
						<Link
							key={href}
							href={href}
							onClick={onNavigate}
							className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
								active ? "bg-white/10 text-white font-bold" : "text-gray-300 hover:bg-white/5"
							}`}
						>
							<Icon size={20} weight={active ? "fill" : "regular"} />
							<span className="text-body-md">{label}</span>
						</Link>
					);
				})}

				<div className="mt-8 pt-8 border-t border-white/10">
					<PendingCounter />
				</div>
			</nav>

			<div className="mt-auto pt-8 border-t border-white/10">
				<button
					onClick={onLogout}
					className="flex items-center gap-4 p-3 text-gray-300 hover:bg-white/5 rounded-lg transition-colors w-full text-left"
				>
					<SignOut size={20} />
					<span className="text-body-md">Sair</span>
				</button>
			</div>
		</>
	);
}
