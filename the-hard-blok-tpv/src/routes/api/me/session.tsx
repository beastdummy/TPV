import { createFileRoute } from "@tanstack/react-router";

import { corsHeadersForRequest } from "../../../lib/cors";

/**
 * GET /api/me/session — sesión actual (cookies). Pensado para la web comercial
 * con fetch credentials + CORS (mismo usuario que el TPV).
 */
export const Route = createFileRoute("/api/me/session")({
	server: {
		handlers: {
			OPTIONS: async ({ request }: { request: Request }) => {
				return new Response(null, {
					status: 204,
					headers: corsHeadersForRequest(request),
				});
			},
			GET: async ({ request }: { request: Request }) => {
				const cors = corsHeadersForRequest(request);

				try {
					const { getRequestHeaders } = await import(
						"@tanstack/react-start/server"
					);
					const { getAuth } = await import("../../../lib/auth.server");

					const headers = getRequestHeaders();
					const session = await getAuth().api.getSession({ headers });

					if (!session) {
						return Response.json(
							{ user: null },
							{ status: 200, headers: cors },
						);
					}

					const { syncAppUserFromBetterAuthSession } = await import(
						"../../../features/auth/app-user.server"
					);
					const appUser = await syncAppUserFromBetterAuthSession({
						userId: session.user.id,
						email: session.user.email,
						name: session.user.name,
					});

					return Response.json(
						{
							user: {
								id: appUser.id,
								email: appUser.email,
								name: appUser.name,
								role: appUser.role,
							},
						},
						{ status: 200, headers: cors },
					);
				} catch {
					return Response.json(
						{ user: null, error: "AUTH_UNAVAILABLE" },
						{ status: 503, headers: cors },
					);
				}
			},
		},
	},
});
