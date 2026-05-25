import { getWebAppOrigins } from "./web-app-url";

export function corsHeadersForRequest(request: Request): HeadersInit {
	const origin = request.headers.get("Origin");
	const allowed = getWebAppOrigins();

	if (!origin || !allowed.includes(origin)) {
		return {};
	}

	return {
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Allow-Credentials": "true",
		"Access-Control-Allow-Methods": "GET, OPTIONS",
		"Access-Control-Allow-Headers": "Accept, Content-Type",
		Vary: "Origin",
	};
}
