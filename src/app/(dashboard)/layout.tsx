"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { List, X } from "@phosphor-icons/react";
import { SidebarContent } from "@/components/layout/SidebarContent";
import { ToastProvider } from "@/contexts/ToastContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const [mobileNavOpen, setMobileNavOpen] = useState(false);

	async function handleLogout() {
		await fetch("/api/auth/logout", { method: "POST" });
		router.push("/login");
	}

	useEffect(() => {
		document.body.style.overflow = mobileNavOpen ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [mobileNavOpen]);

	return (
		<div className="flex min-h-screen overflow-x-hidden">
			<ToastProvider>
			{/* Sidebar (desktop) */}
			<aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-on-primary-fixed text-white py-10 px-6 z-50">
				<SidebarContent onLogout={handleLogout} />
			</aside>

			{/* Mobile nav overlay */}
			{mobileNavOpen && (
				<div className="md:hidden fixed inset-0 z-[60] bg-on-primary-fixed text-white flex flex-col py-10 px-6">
					<button
						onClick={() => setMobileNavOpen(false)}
						aria-label="Fechar menu"
						className="absolute top-8 right-6 text-white w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
					>
						<X size={22} />
					</button>
					<SidebarContent
						onNavigate={() => setMobileNavOpen(false)}
						onLogout={() => {
							setMobileNavOpen(false);
							handleLogout();
						}}
					/>
				</div>
			)}

			{/* Main content */}
			<div className="flex-1 min-w-0 md:ml-64 flex flex-col min-h-screen">
				{/* Top bar */}
				<header className="md:hidden sticky top-0 z-40 bg-on-primary-fixed border-b border-white/10 flex items-center w-full px-4 sm:px-8 py-3">
					<div className="flex items-center gap-3">
						<button
							onClick={() => setMobileNavOpen(true)}
							aria-label="Abrir menu"
							className="-ml-2 text-white/70 hover:text-white transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"
						>
							<List size={22} />
						</button>
						<Link href="/" className="text-[1.0625rem] font-medium text-white">
							Crias na Floresta - Gestão
						</Link>
					</div>
				</header>

				<main className="flex-1 pt-6 pb-4 px-4 sm:p-8 max-w-7xl mx-auto w-full">{children}</main>
			</div>
			</ToastProvider>
		</div>
	);
}
