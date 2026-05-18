import type { SaleIdempotentOperation } from "./types";

const KEY_PREFIX = "sale";
const KEY_VERSION = "v1";

export type BuildSaleIdempotencyKeyInput = {
	businessId: string;
	operation: SaleIdempotentOperation;
	clientRequestId: string;
};

/**
 * Clave determinista para deduplicar finalize en reintentos de red.
 * Persistir en `sales.idempotency_key` o tabla dedicada.
 */
export function buildSaleIdempotencyKey(
	input: BuildSaleIdempotencyKeyInput,
): string {
	const parts = [
		KEY_PREFIX,
		KEY_VERSION,
		input.businessId,
		input.operation,
		input.clientRequestId.trim(),
	];
	return parts.join(":");
}

export type ParsedSaleIdempotencyKey = BuildSaleIdempotencyKeyInput & {
	raw: string;
};

/**
 * Parseo básico para debugging/tests. No valida UUIDs.
 */
export function parseSaleIdempotencyKey(
	raw: string,
): ParsedSaleIdempotencyKey | null {
	const segments = raw.split(":");
	if (segments.length !== 5) {
		return null;
	}

	const [prefix, version, businessId, operation, clientRequestId] = segments;
	if (prefix !== KEY_PREFIX || version !== KEY_VERSION) {
		return null;
	}

	if (operation !== "finalize_sale") {
		return null;
	}

	return {
		raw,
		businessId,
		operation,
		clientRequestId,
	};
}
