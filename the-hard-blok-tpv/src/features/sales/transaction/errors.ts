/**
 * Códigos de error estables para ventas transaccionales.
 * Usar en RPC/handlers cuando se implemente finalize.
 */

export const SALES_TX_ERROR_CODES = {
	NOT_IMPLEMENTED: "SALES_TX_NOT_IMPLEMENTED",
	UNAUTHORIZED: "SALES_TX_UNAUTHORIZED",
	FORBIDDEN: "SALES_TX_FORBIDDEN",
	VALIDATION: "SALES_TX_VALIDATION",
	SALE_NOT_FOUND: "SALES_TX_SALE_NOT_FOUND",
	CASH_SESSION_CLOSED: "SALES_TX_CASH_SESSION_CLOSED",
	CASH_SESSION_NOT_FOUND: "SALES_TX_CASH_SESSION_NOT_FOUND",
	CASH_SESSION_ALREADY_OPEN: "SALES_TX_CASH_SESSION_ALREADY_OPEN",
	CASH_SESSION_NOT_OPEN: "SALES_TX_CASH_SESSION_NOT_OPEN",
	CASH_SESSION_PENDING_SALES: "SALES_TX_CASH_SESSION_PENDING_SALES",
	STOCK_NOT_FOUND: "SALES_TX_STOCK_NOT_FOUND",
	INSUFFICIENT_STOCK: "SALES_TX_INSUFFICIENT_STOCK",
	IDEMPOTENCY_CONFLICT: "SALES_TX_IDEMPOTENCY_CONFLICT",
	CONCURRENCY: "SALES_TX_CONCURRENCY",
	INTERNAL: "SALES_TX_INTERNAL",
} as const;

export type SalesTxErrorCode =
	(typeof SALES_TX_ERROR_CODES)[keyof typeof SALES_TX_ERROR_CODES];

export class SalesTransactionError extends Error {
	readonly code: SalesTxErrorCode;

	constructor(code: SalesTxErrorCode, message: string) {
		super(message);
		this.name = "SalesTransactionError";
		this.code = code;
	}
}

export function isSalesTransactionError(
	error: unknown,
): error is SalesTransactionError {
	return error instanceof SalesTransactionError;
}
