import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const { getAuth } = await import("../../../lib/auth.server");
				return await getAuth().handler(request);
			},
			POST: async ({ request }: { request: Request }) => {
				const { getAuth } = await import("../../../lib/auth.server");
				return await getAuth().handler(request);
			},
		},
	},
});
