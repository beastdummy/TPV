import { SALES_TX_ERROR_CODES, SalesTransactionError } from "./errors";
import type { FinalizeSaleInput, FinalizeSaleResult } from "./types";

/**
 * Pasos atómicos dentro de una transacción `FinalizeSale`.
 * Orden fijo — ver docs/architecture/sales-transaction-architecture.md
 */
export const SALES_FINALIZE_BOUNDARY = [
	"validate_context",
	"claim_idempotency",
	"insert_sale_header",
	"insert_sale_lines",
	"insert_sale_payments",
	"decrement_stock",
	"finalize_sale_status",
	"store_idempotency_result",
] as const;

export type SalesFinalizeStep = (typeof SALES_FINALIZE_BOUNDARY)[number];

/** Operaciones de sesión de caja (TX separadas de finalize). */
export const CASH_SESSION_BOUNDARY = {
	open: ["validate_context", "insert_cash_session"] as const,
	close: [
		"validate_context",
		"lock_session",
		"reject_if_pending_sales",
		"aggregate_totals",
		"close_session",
	] as const,
};

/**
 * Lanzar desde scaffolding o stubs hasta que exista el comando real.
 */
export function assertSalesTransactionNotImplemented(operation: string): never {
	throw new SalesTransactionError(
		SALES_TX_ERROR_CODES.NOT_IMPLEMENTED,
		`Operación transaccional no implementada: ${operation}`,
	);
}

/**
 * Stub documentado — NO ejecuta persistencia ni stock.
 * Sustituir por `finalizeSaleCommand` en fase de implementación.
 */
export async function finalizeSaleStub(
	_input: FinalizeSaleInput,
): Promise<FinalizeSaleResult> {
	assertSalesTransactionNotImplemented("finalize_sale");
}
