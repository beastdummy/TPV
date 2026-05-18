import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";

import { AdminShell } from "../../components/layout/admin-shell";
import { requireBusinessPermissionForRoute } from "../../features/auth/route-guards";
import { listBusinessAuditLogsFn } from "../../features/business-setup/setup.rpc";

const ACTION_LABELS: Record<string, string> = {
	"business.created": "Empresa creada / confirmada",
	"owner.registered": "Propietario registrado",
	"warehouse.created": "Almacén creado",
	"category.created": "Categoría creada",
	"product.created": "Producto creado",
	"stock.initial_recorded": "Stock inicial registrado",
	"cash_session.opened": "Caja abierta",
	"sale.finalized": "Venta finalizada",
	"setup.completed": "Configuración completada",
};

export const Route = createFileRoute("/admin/audit")({
	beforeLoad: async ({ location }) => {
		await requireBusinessPermissionForRoute("audit.view", location.href);
	},
	loader: async () => {
		const logs = await listBusinessAuditLogsFn();
		return { logs };
	},
	component: AdminAuditPage,
});

function AdminAuditPage() {
	const { logs } = Route.useLoaderData();

	return (
		<AdminShell
			title="Auditoría"
			description="Registro de acciones relevantes en el negocio."
		>
			{logs.length === 0 ? (
				<div className="rounded-3xl border border-dashed bg-muted/20 px-6 py-12 text-center">
					<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border bg-card">
						<ClipboardList className="h-6 w-6 text-muted-foreground" />
					</div>
					<h2 className="text-lg font-semibold">Sin registros todavía</h2>
					<p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
						Las acciones del negocio aparecerán aquí en orden cronológico.
					</p>
				</div>
			) : (
				<ul className="divide-y rounded-3xl border bg-background">
					{logs.map((log) => (
						<li
							key={log.id}
							className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 text-sm"
						>
							<div>
								<p className="font-medium">
									{ACTION_LABELS[log.action] ?? log.action}
								</p>
								<p className="mt-1 text-muted-foreground">
									{log.actor_user_name ?? "Sistema"}
									{log.entity_type ? ` · ${log.entity_type}` : ""}
								</p>
							</div>
							<time className="text-xs text-muted-foreground">
								{new Date(log.created_at).toLocaleString("es-ES")}
							</time>
						</li>
					))}
				</ul>
			)}
		</AdminShell>
	);
}
