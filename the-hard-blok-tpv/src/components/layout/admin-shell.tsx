import { Link, useRouterState } from "@tanstack/react-router";
import { FolderTree, LayoutGrid, Package } from "lucide-react";
import type { ReactNode } from "react";

type AdminShellProps = {
	title: string;
	description?: string;
	children: ReactNode;
	actions?: ReactNode;
};

const navItems = [
	{
		to: "/admin",
		label: "Resumen",
		icon: LayoutGrid,
	},
	{
		to: "/admin/categories",
		label: "Categorías",
		icon: FolderTree,
	},
	{
		to: "/admin/products",
		label: "Productos",
		icon: Package,
	},
];

export function AdminShell({
	title,
	description,
	children,
	actions,
}: AdminShellProps) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	return (
		<div className="min-h-screen bg-muted/30 text-foreground">
			<div className="mx-auto flex w-full max-w-400 gap-6 p-6">
				<aside className="sticky top-6 h-fit w-65 rounded-3xl border bg-card p-4">
					<div className="mb-4 border-b pb-4">
						<p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
							Administración
						</p>
						<h2 className="mt-2 text-xl font-semibold">The Hard Blok</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							Gestión de categorías y productos
						</p>
					</div>

					<nav className="space-y-2">
						{navItems.map((item) => {
							const Icon = item.icon;
							const isActive =
								pathname === item.to ||
								(item.to !== "/admin" && pathname.startsWith(item.to));

							return (
								<Link
									key={item.to}
									to={item.to}
									className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
										isActive
											? "border border-primary bg-primary/10 font-medium text-foreground"
											: "border border-transparent bg-background hover:bg-muted"
									}`}
								>
									<Icon className="h-4 w-4" />
									<span>{item.label}</span>
								</Link>
							);
						})}
					</nav>
				</aside>

				<main className="min-w-0 flex-1">
					<section className="rounded-3xl border bg-card p-6">
						<div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b pb-4">
							<div>
								<p className="text-sm text-muted-foreground">Panel admin</p>
								<h1 className="text-3xl font-semibold tracking-tight">
									{title}
								</h1>
								{description ? (
									<p className="mt-2 text-sm text-muted-foreground">
										{description}
									</p>
								) : null}
							</div>

							{actions ? (
								<div className="flex items-center gap-3">{actions}</div>
							) : null}
						</div>

						{children}
					</section>
				</main>
			</div>
		</div>
	);
}
