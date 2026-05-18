import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
	Boxes,
	ClipboardList,
	FolderTree,
	LayoutGrid,
	Monitor,
	Package,
	Settings,
	Shield,
	ShoppingCart,
	Users,
	Warehouse,
} from "lucide-react";
import type { ReactNode } from "react";

import type { AdminNavLinkKey } from "../../features/business-staff/admin-nav.server";
import { getAdminNavContextFn } from "../../features/business-staff/staff.server-fns";

type AdminShellProps = {
	title: string;
	description?: string;
	children: ReactNode;
	actions?: ReactNode;
};

type NavItemDef = {
	key: AdminNavLinkKey;
	to: string;
	label: string;
	icon: LucideIcon;
};

const navItemDefs: NavItemDef[] = [
	{ key: "dashboard", to: "/admin", label: "Dashboard", icon: LayoutGrid },
	{ key: "sales", to: "/sales", label: "Ventas / TPV", icon: Monitor },
	{
		key: "categories",
		to: "/admin/categories",
		label: "Categorías",
		icon: FolderTree,
	},
	{ key: "products", to: "/admin/products", label: "Productos", icon: Package },
	{
		key: "warehouses",
		to: "/admin/warehouses",
		label: "Almacenes",
		icon: Warehouse,
	},
	{
		key: "inventory",
		to: "/admin/inventory",
		label: "Inventario",
		icon: Boxes,
	},
	{
		key: "purchases",
		to: "/admin/purchases",
		label: "Compras",
		icon: ShoppingCart,
	},
	{
		key: "employees",
		to: "/admin/employees",
		label: "Empleados",
		icon: Users,
	},
	{
		key: "roles",
		to: "/admin/roles",
		label: "Roles y permisos",
		icon: Shield,
	},
	{ key: "audit", to: "/admin/audit", label: "Auditoría", icon: ClipboardList },
	{
		key: "settings",
		to: "/admin/settings",
		label: "Configuración",
		icon: Settings,
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

	const navQuery = useQuery({
		queryKey: ["admin-nav-context"],
		queryFn: () => getAdminNavContextFn(),
		staleTime: 60_000,
	});

	const visibleKeys = navQuery.data?.visible;
	const navItems = navItemDefs.filter((item) => {
		if (!visibleKeys) {
			return item.key === "dashboard" || item.key === "sales";
		}
		return visibleKeys[item.key];
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
							Catálogo, inventario y equipo
						</p>
					</div>

					<nav className="space-y-2">
						{navItems.map((item) => {
							const Icon = item.icon;
							const isActive =
								pathname === item.to ||
								(item.to === "/admin"
									? pathname === "/admin" || pathname === "/admin/"
									: item.to !== "/sales" && pathname.startsWith(item.to));

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
