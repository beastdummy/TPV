import { Link, useRouterState } from "@tanstack/react-router";
import { Building2, LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { authClient } from "../../lib/auth-client";

type PlatformShellProps = {
	title: string;
	userName: string;
	children: ReactNode;
};

export function PlatformShell({
	title,
	userName,
	children,
}: PlatformShellProps) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	async function handleLogout() {
		await authClient.signOut();
		window.location.href = "/login";
	}

	return (
		<div className="min-h-screen bg-slate-950 text-slate-50">
			<div className="grid min-h-screen grid-cols-[88px_1fr]">
				<aside className="flex flex-col items-center justify-between border-r border-slate-800 bg-slate-900 px-3 py-4">
					<div className="flex w-full flex-col items-center gap-4">
						<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm">
							<span className="text-lg font-black">PB</span>
						</div>

						<nav className="flex w-full flex-col items-center gap-3">
							<Link
								to="/platform"
								className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition ${
									pathname === "/platform"
										? "border-violet-500 bg-violet-600 text-white"
										: "border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-800"
								}`}
								aria-label="Plataforma"
							>
								<Building2 className="h-5 w-5" />
							</Link>
						</nav>
					</div>

					<button
						type="button"
						onClick={handleLogout}
						className="flex h-12 w-12 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-800"
						aria-label="Cerrar sesión"
					>
						<LogOut className="h-5 w-5" />
					</button>
				</aside>

				<main className="flex min-h-screen flex-col">
					<header className="flex h-20 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
						<div>
							<p className="text-sm text-slate-400">
								The Hard Blok — Plataforma
							</p>
							<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
						</div>
						<div className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm">
							{userName}
						</div>
					</header>
					<section className="flex-1 p-6">{children}</section>
				</main>
			</div>
		</div>
	);
}
