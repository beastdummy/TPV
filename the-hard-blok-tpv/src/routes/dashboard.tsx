import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "../components/layout/app-shell";
import { getAppUserFn } from "../features/auth/auth.rpc";

export const Route = createFileRoute("/dashboard")({
	beforeLoad: async ({ location }) => {
		const user = await getAppUserFn();
		if (!user) {
			throw redirect({ to: "/login", search: { redirect: location.href } });
		}
	},
	component: DashboardPage,
});

function DashboardPage() {
	return (
		<AppShell title="Dashboard">
			<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
				<div className="rounded-3xl border bg-card p-6">
					<p className="text-sm text-muted-foreground">Ventas del día</p>
					<p className="mt-3 text-3xl font-bold">€0,00</p>
				</div>

				<div className="rounded-3xl border bg-card p-6">
					<p className="text-sm text-muted-foreground">Tickets</p>
					<p className="mt-3 text-3xl font-bold">0</p>
				</div>

				<div className="rounded-3xl border bg-card p-6">
					<p className="text-sm text-muted-foreground">Clientes</p>
					<p className="mt-3 text-3xl font-bold">0</p>
				</div>

				<div className="rounded-3xl border bg-card p-6">
					<p className="text-sm text-muted-foreground">Estado</p>
					<p className="mt-3 text-3xl font-bold">Abierto</p>
				</div>
			</div>
		</AppShell>
	);
}
