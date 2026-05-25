/**
 * Origen de la web comercial (login/registro redirigen de vuelta aquí).
 * @see .env.example WEB_APP_URL
 */
export function getWebAppOrigins(): string[] {
	const raw = process.env.WEB_APP_URL?.trim();
	if (!raw) {
		return ["http://localhost:3001", "http://127.0.0.1:3001"];
	}

	return raw
		.split(",")
		.map((part) => part.trim().replace(/\/$/, ""))
		.filter(Boolean);
}

export function isAllowedWebReturnTo(url: string): boolean {
	try {
		const parsed = new URL(url);
		const origin = parsed.origin;
		return getWebAppOrigins().some((allowed) => allowed === origin);
	} catch {
		return false;
	}
}
