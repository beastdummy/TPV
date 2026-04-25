import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

export function hashPassword(password: string) {
	const salt = randomBytes(16).toString("base64url");
	const derived = scryptSync(password, salt, SCRYPT_KEYLEN, {
		N: SCRYPT_N,
		r: SCRYPT_R,
		p: SCRYPT_P,
	}).toString("base64url");

	return `scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
	const [algorithm, nRaw, rRaw, pRaw, salt, expectedHash] =
		storedHash.split(":");

	if (
		algorithm !== "scrypt" ||
		!nRaw ||
		!rRaw ||
		!pRaw ||
		!salt ||
		!expectedHash
	) {
		return false;
	}

	const n = Number.parseInt(nRaw, 10);
	const r = Number.parseInt(rRaw, 10);
	const p = Number.parseInt(pRaw, 10);

	if (Number.isNaN(n) || Number.isNaN(r) || Number.isNaN(p)) {
		return false;
	}

	const derived = scryptSync(password, salt, SCRYPT_KEYLEN, {
		N: n,
		r,
		p,
	}).toString("base64url");

	return timingSafeEqual(
		Buffer.from(derived, "utf8"),
		Buffer.from(expectedHash, "utf8"),
	);
}
