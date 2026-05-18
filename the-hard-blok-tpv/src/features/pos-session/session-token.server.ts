import { createHmac, timingSafeEqual } from "node:crypto";

type TokenPayload = {
	sessionId: string;
	businessId: string;
	terminalId: string;
	exp: number;
};

function getSigningSecret() {
	const secret =
		process.env.POS_OPERATOR_TOKEN_SECRET?.trim() ||
		process.env.BETTER_AUTH_SECRET?.trim();

	if (!secret) {
		throw new Error(
			"POS_OPERATOR_TOKEN_SECRET or BETTER_AUTH_SECRET is required",
		);
	}

	return secret;
}

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function encodePayload(payload: TokenPayload): string {
	return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(encoded: string): TokenPayload | null {
	try {
		const parsed = JSON.parse(
			Buffer.from(encoded, "base64url").toString("utf8"),
		) as TokenPayload;

		if (
			typeof parsed.sessionId !== "string" ||
			typeof parsed.businessId !== "string" ||
			typeof parsed.terminalId !== "string" ||
			typeof parsed.exp !== "number"
		) {
			return null;
		}

		return parsed;
	} catch {
		return null;
	}
}

export function createPosSessionToken(input: {
	sessionId: string;
	businessId: string;
	terminalId: string;
}): string {
	const payload: TokenPayload = {
		sessionId: input.sessionId,
		businessId: input.businessId,
		terminalId: input.terminalId,
		exp: Date.now() + TOKEN_TTL_MS,
	};

	const body = encodePayload(payload);
	const signature = createHmac("sha256", getSigningSecret())
		.update(body)
		.digest("base64url");

	return `${body}.${signature}`;
}

export function verifyPosSessionToken(
	token: string | undefined | null,
): TokenPayload | null {
	if (!token?.trim()) {
		return null;
	}

	const [body, signature] = token.trim().split(".");
	if (!body || !signature) {
		return null;
	}

	const expected = createHmac("sha256", getSigningSecret())
		.update(body)
		.digest("base64url");

	try {
		if (
			!timingSafeEqual(
				Buffer.from(signature, "utf8"),
				Buffer.from(expected, "utf8"),
			)
		) {
			return null;
		}
	} catch {
		return null;
	}

	const payload = decodePayload(body);
	if (!payload || payload.exp < Date.now()) {
		return null;
	}

	return payload;
}
