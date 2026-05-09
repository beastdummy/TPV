import { createFileRoute } from "@tanstack/react-router";

import {
	DEFAULT_DASHBOARD_RANGE,
	isDashboardRange,
} from "../../../features/dashboard/types";

/**
 * GET /api/me/dashboard?range=today|7d|30d
 *
 * Devuelve KPIs agregados, ventas por día (gráfica), top productos y
 * ventas por empleado para el negocio del usuario autenticado.
 *
 * Autorización: solo `owner` y `manager` (dueño / encargado).
 * Cualquier otro rol o sesión inválida → 403 / 401.
 */
export const Route = createFileRoute("/api/me/dashboard")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const { getRequestHeaders } = await import(
					"@tanstack/react-start/server"
				);
				const { getAuth } = await import("../../../lib/auth.server");

				const headers = getRequestHeaders();
				const session = await getAuth().api.getSession({ headers });

				if (!session) {
					return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
				}

				const { syncAppUserFromBetterAuthSession } = await import(
					"../../../features/auth/app-user.server"
				);
				const appUser = await syncAppUserFromBetterAuthSession({
					userId: session.user.id,
					email: session.user.email,
					name: session.user.name,
				});

				if (!appUser) {
					return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
				}

				if (appUser.role !== "owner" && appUser.role !== "manager") {
					return Response.json({ error: "FORBIDDEN" }, { status: 403 });
				}

				const url = new URL(request.url);
				const rawRange = url.searchParams.get("range");
				const range = isDashboardRange(rawRange)
					? rawRange
					: DEFAULT_DASHBOARD_RANGE;

				const { getDashboardData } = await import(
					"../../../features/dashboard/queries.server"
				);
				const data = await getDashboardData({ range });

				return Response.json(data);
			},
		},
	},
});
