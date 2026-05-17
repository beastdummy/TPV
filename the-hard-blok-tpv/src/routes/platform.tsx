import { createFileRoute } from "@tanstack/react-router";

import { PlatformShell } from "../components/layout/platform-shell";
import { requirePlatformAdminForRoute } from "../features/auth/route-guards";
import { getPlatformDashboardFn } from "../features/platform/platform.rpc";

export const Route = createFileRoute("/platform")({
	beforeLoad: async ({ location }) => {
		return await requirePlatformAdminForRoute(location.href);
	},
	loader: async ({ context }) => {
		const dashboard = await getPlatformDashboardFn();
		return {
			userName: context.user.name,
			dashboard,
		};
	},
	component: PlatformPage,
});

function formatNumber(value: number): string {
	return new Intl.NumberFormat("es-ES").format(value);
}

function formatCents(cents: number): string {
	return new Intl.NumberFormat("es-ES", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 2,
	}).format(cents / 100);
}

function formatDate(iso: string): string {
	return new Intl.DateTimeFormat("es-ES", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(iso));
}

function statusClass(status: string): string {
	switch (status) {
		case "active":
			return "bg-emerald-500/15 text-emerald-300";
		case "suspended":
			return "bg-amber-500/15 text-amber-300";
		default:
			return "bg-slate-500/15 text-slate-300";
	}
}

function SummaryCard({
	label,
	value,
	hint,
}: {
	label: string;
	value: string;
	hint?: string;
}) {
	return (
		<div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
			<p className="text-sm text-slate-400">{label}</p>
			<p className="mt-2 text-2xl font-semibold">{value}</p>
			{hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
		</div>
	);
}

function PlatformPage() {
	const { userName, dashboard } = Route.useLoaderData();

	return (
		<PlatformShell title="Platform Admin" userName={userName}>
			<div className="space-y-6">
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
					<SummaryCard
						label="Empresas totales"
						value={formatNumber(dashboard.summary.totalBusinesses)}
					/>
					<SummaryCard
						label="Empresas activas"
						value={formatNumber(dashboard.summary.activeBusinesses)}
					/>
					<SummaryCard
						label="Usuarios"
						value={formatNumber(dashboard.summary.totalUsers)}
					/>
					<SummaryCard
						label="Ventas completadas"
						value={formatNumber(dashboard.summary.completedSales)}
					/>
					<SummaryCard
						label="Facturación global"
						value={formatCents(dashboard.summary.totalSalesCents)}
						hint="Todas las empresas"
					/>
				</div>

				<div className="rounded-2xl border border-slate-800 bg-slate-900">
					<div className="border-b border-slate-800 px-4 py-3">
						<h2 className="text-lg font-semibold">Empresas</h2>
						<p className="text-sm text-slate-400">
							Vista global multi-tenant (sin billing real todavía).
						</p>
					</div>

					<div className="overflow-x-auto">
						<table className="min-w-full text-left text-sm">
							<thead className="border-b border-slate-800 text-slate-400">
								<tr>
									<th className="px-4 py-3 font-medium">Nombre</th>
									<th className="px-4 py-3 font-medium">Slug</th>
									<th className="px-4 py-3 font-medium">Estado</th>
									<th className="px-4 py-3 font-medium">Alta</th>
									<th className="px-4 py-3 font-medium">Plan</th>
									<th className="px-4 py-3 font-medium">Owner</th>
									<th className="px-4 py-3 font-medium">Usuarios</th>
									<th className="px-4 py-3 font-medium">Ventas</th>
								</tr>
							</thead>
							<tbody>
								{dashboard.businesses.length === 0 ? (
									<tr>
										<td
											colSpan={8}
											className="px-4 py-8 text-center text-slate-400"
										>
											No hay empresas registradas todavía.
										</td>
									</tr>
								) : (
									dashboard.businesses.map((business) => (
										<tr
											key={business.id}
											className="border-b border-slate-800/80 last:border-0"
										>
											<td className="px-4 py-3 font-medium">{business.name}</td>
											<td className="px-4 py-3 font-mono text-slate-300">
												{business.slug}
											</td>
											<td className="px-4 py-3">
												<span
													className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(business.status)}`}
												>
													{business.status}
												</span>
											</td>
											<td className="px-4 py-3 text-slate-300">
												{formatDate(business.createdAt)}
											</td>
											<td className="px-4 py-3 capitalize text-slate-300">
												{business.plan}
											</td>
											<td className="px-4 py-3 text-slate-300">
												{business.ownerEmail ?? "—"}
											</td>
											<td className="px-4 py-3 text-slate-300">
												{formatNumber(business.memberCount)}
											</td>
											<td className="px-4 py-3 text-slate-300">
												{formatNumber(business.salesCount)}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</PlatformShell>
	);
}
