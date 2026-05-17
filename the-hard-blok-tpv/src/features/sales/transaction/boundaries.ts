import { SALES_TX_ERROR_CODES, SalesTransactionError } from "./errors";
import type { FinalizeSaleInput, FinalizeSaleResult } from "./types";

/**
 * Pasos atómicos dentro de una transacción `FinalizeSale`.
 * Orden fijo — ver docs/architecture/sales-transaction-architecture.md
 *
 * Fase C1 implementa hasta `finalize_sale_status` + `store_idempotency_result`.
 * Pendiente: `insert_sale_payments`, `decrement_stock`.
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

export function assertSalesTransactionNotImplemented(operation: string): never {
	throw new SalesTransactionError(
		SALES_TX_ERROR_CODES.NOT_IMPLEMENTED,
		`Operación transaccional no implementada: ${operation}`,
	);
}

/**
 * Finaliza venta (Fase C1) — delega en `finalize-sale-access.server`.
 */
export async function finalizeSale(
	input: FinalizeSaleInput,
): Promise<FinalizeSaleResult> {
	const { finalizeSale: finalizeSaleCommand } = await import(
		"../finalize-sale-access.server"
	);
	return await finalizeSaleCommand(input);
}

/** @deprecated Usar `finalizeSale`. */
export const finalizeSaleStub = finalizeSale;
