import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "../../components/layout/admin-shell";
import { requireBusinessPermissionForRoute } from "../../features/auth/route-guards";

export const Route = createFileRoute("/admin/audit")({
	beforeLoad: async ({ location }) => {
		await requireBusinessPermissionForRoute("audit.view", location.href);
	},
	component: AdminAuditPage,
});

function AdminAuditPage() {
	return (
		<AdminShell
			title="Auditoría"
			description="Registro de acciones relevantes en el negocio."
		>
			<p className="text-sm text-muted-foreground">
				Módulo en preparación. Los propietarios y roles con permiso{" "}
				<code className="rounded bg-muted px-1">audit.view</code> pueden
				acceder.
			</p>
		</AdminShell>
	);
}
