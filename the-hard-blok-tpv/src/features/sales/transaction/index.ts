/**
 * Foundations transaccionales de ventas (no operativo).
 * @see docs/architecture/sales-transaction-architecture.md
 */

export type { SalesFinalizeStep } from "./boundaries";
export {
	assertSalesTransactionNotImplemented,
	CASH_SESSION_BOUNDARY,
	finalizeSaleStub,
	SALES_FINALIZE_BOUNDARY,
} from "./boundaries";
export type { SalesTxErrorCode } from "./errors";
export {
	isSalesTransactionError,
	SALES_TX_ERROR_CODES,
	SalesTransactionError,
} from "./errors";
export type {
	BuildSaleIdempotencyKeyInput,
	ParsedSaleIdempotencyKey,
} from "./idempotency";
export {
	buildSaleIdempotencyKey,
	parseSaleIdempotencyKey,
} from "./idempotency";
export type {
	CashSessionStatus,
	ClientTicketPhase,
	FinalizeSaleInput,
	FinalizeSaleResult,
	SaleIdempotentOperation,
	SaleLineInput,
	SalePaymentMethod,
	SaleStatus,
	SaleTransactionContext,
} from "./types";
export {
	CASH_SESSION_STATUSES,
	CLIENT_TICKET_PHASES,
	SALE_IDEMPOTENT_OPERATIONS,
	SALE_PAYMENT_METHODS,
	SALE_STATUSES,
} from "./types";
