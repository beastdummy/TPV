import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Receipt, Settings } from "lucide-react";
import type { ReactNode } from "react";

import { authClient } from "../../lib/auth-client";

type AppShellProps = {
	title: string;
	children: ReactNode;
};

const navigation = [
	{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ to: "/sales", label: "Ventas", icon: Receipt },
];

export function AppShell({ title, children }: AppShellProps) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	async function handleLogout() {
		await authClient.signOut();
		window.location.href = "/login";
	}

	return (
		<div className="min-h-screen bg-muted/30 text-foreground">
			<div className="grid min-h-screen grid-cols-[88px_1fr]">
				<aside className="flex flex-col items-center justify-between border-r bg-background px-3 py-4">
					<div className="flex w-full flex-col items-center gap-4">
						<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
							<span className="text-lg font-black">TB</span>
						</div>

						<nav className="flex w-full flex-col items-center gap-3">
							{navigation.map((item) => {
								const Icon = item.icon;
								const isActive = pathname === item.to;

								return (
									<Link
										key={item.to}
										to={item.to}
										className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition ${
											isActive
												? "border-primary bg-primary text-primary-foreground shadow-sm"
												: "border-transparent bg-background text-muted-foreground hover:border-border hover:bg-muted"
										}`}
									>
										<Icon className="h-5 w-5" />
									</Link>
								);
							})}
						</nav>
					</div>

					<div className="flex w-full flex-col items-center gap-3">
						<button
							type="button"
							className="flex h-12 w-12 items-center justify-center rounded-2xl text-muted-foreground transition hover:bg-muted"
							aria-label="Configuración"
						>
							<Settings className="h-5 w-5" />
						</button>

						<button
							type="button"
							onClick={handleLogout}
							className="flex h-12 w-12 items-center justify-center rounded-2xl text-muted-foreground transition hover:bg-muted"
							aria-label="Cerrar sesión"
						>
							<LogOut className="h-5 w-5" />
						</button>
					</div>
				</aside>

				<main className="flex min-h-screen flex-col">
					<header className="flex h-20 items-center justify-between border-b bg-background px-6">
						<div>
							<p className="text-sm text-muted-foreground">The Hard Blok</p>
							<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
						</div>

						<div className="flex items-center gap-3">
							<div className="rounded-xl border bg-card px-3 py-2 text-sm">
								Caja principal
							</div>
							<div className="rounded-xl border bg-card px-3 py-2 text-sm">
								Adrián
							</div>
						</div>
					</header>

					<section className="flex-1 p-6">{children}</section>
				</main>
			</div>
		</div>
	);
}
